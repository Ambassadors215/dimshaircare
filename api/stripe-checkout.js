import Stripe from "stripe";
import {
  addBooking,
  getProvider,
  getNegotiationById,
  getBookingByRef,
  patchBooking,
} from "../lib/kv-store.js";
import {
  notifyCheckoutStartedAdmin,
  notifyCheckoutStartedCustomer,
  notifyCheckoutStartedProvider,
} from "../lib/notify.js";

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function safeText(s, max = 5000) {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function siteOrigin() {
  const u = process.env.SITE_URL || "https://clips-service.vercel.app";
  return String(u).replace(/\/$/, "");
}

async function resolveConnectAccount(providerId) {
  if (!providerId) return null;
  try {
    const providerRecord = await getProvider(String(providerId));
    if (providerRecord?.stripeAccountId && providerRecord?.onboarded) {
      return providerRecord.stripeAccountId;
    }
  } catch (e) {
    console.warn("PROVIDER_LOOKUP", e.message);
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return endJson(res, 200, {
      ok: false,
      code: "NO_STRIPE",
      error: "Online payments are not configured",
    });
  }

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw);
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const origin = siteOrigin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  /* ── Pay after agreed price (customer dashboard) ── */
  const negotiationId = safeText(payload?.negotiationId, 28);
  if (negotiationId) {
    const email = safeText(payload?.email, 120);
    const consent = Boolean(payload?.consent);
    if (!isValidEmail(email) || !consent) {
      return endJson(res, 400, { ok: false, error: "Valid email and consent are required" });
    }

    let neg;
    try {
      neg = await getNegotiationById(negotiationId);
    } catch (e) {
      console.error("NEG_LOOKUP", e);
      return endJson(res, 500, { ok: false, error: "Could not load negotiation" });
    }
    if (!neg) return endJson(res, 404, { ok: false, error: "Negotiation not found" });
    if (String(neg.customerEmail).toLowerCase() !== email.toLowerCase()) {
      return endJson(res, 403, { ok: false, error: "Email does not match this request" });
    }
    if (neg.status !== "agreed" || neg.agreedPrice == null) {
      return endJson(res, 400, { ok: false, error: "Price must be agreed before payment" });
    }

    const subtotalGBP = Number(neg.agreedPrice);
    if (!Number.isFinite(subtotalGBP) || subtotalGBP < 1 || subtotalGBP > 5000) {
      return endJson(res, 400, { ok: false, error: "Invalid agreed amount" });
    }

    const booking = await getBookingByRef(neg.bookingRef);
    if (!booking) return endJson(res, 404, { ok: false, error: "Booking not found" });

    const fee = Math.round(subtotalGBP * 0.15 * 100) / 100;
    const total = Math.round((subtotalGBP + fee) * 100) / 100;
    const unitAmountPence = Math.round(total * 100);
    if (unitAmountPence < 30) return endJson(res, 400, { ok: false, error: "Amount too small for card payment" });

    const ref = String(booking.ref);
    const providerId = String(neg.providerId || booking.providerId || "");
    const connectedAccountId = await resolveConnectAccount(providerId);
    const providerSharePence = Math.round(subtotalGBP * 100);

    const paymentIntentData = {
      metadata: { bookingRef: ref, negotiationId },
    };
    if (connectedAccountId) {
      paymentIntentData.transfer_data = {
        destination: connectedAccountId,
        amount: providerSharePence,
      };
    }

    const service = safeText(booking.service, 120);
    const payRecord = {
      ...booking,
      status: "awaiting_payment",
      subtotalGBP,
      platformFeeGBP: fee,
      totalGBP: total,
      price: `£${total.toFixed(2)} card`,
      paymentProvider: "stripe_checkout",
      negotiationId,
    };

    try {
      await patchBooking(ref, {
        status: "awaiting_payment",
        subtotalGBP,
        platformFeeGBP: fee,
        totalGBP: total,
        agreedPrice: subtotalGBP,
        price: payRecord.price,
        paymentProvider: "stripe_checkout",
        negotiationId,
      });

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Clip Services — ${service.slice(0, 70)}`,
                description: `Booking ${ref}. Total payable £${total.toFixed(2)} (includes service charge).`,
              },
              unit_amount: unitAmountPence,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/user/?email=${encodeURIComponent(email)}&paid=1&ref=${encodeURIComponent(ref)}`,
        cancel_url: `${origin}/user/?email=${encodeURIComponent(email)}&cancel=1&ref=${encodeURIComponent(ref)}`,
        customer_email: email.trim(),
        client_reference_id: ref,
        metadata: { bookingRef: ref, negotiationId },
        payment_intent_data: paymentIntentData,
      });

      if (!session.url) {
        return endJson(res, 500, { ok: false, error: "No checkout URL returned" });
      }

      const provEmail = String(neg.providerEmail || "").trim();
      void Promise.allSettled([
        notifyCheckoutStartedCustomer(payRecord, session.url),
        notifyCheckoutStartedAdmin(payRecord),
        provEmail ? notifyCheckoutStartedProvider(provEmail, payRecord) : Promise.resolve(),
      ]);

      return endJson(res, 200, { ok: true, url: session.url, ref });
    } catch (e) {
      console.error("STRIPE_CHECKOUT_NEG_ERROR", e);
      return endJson(res, 500, { ok: false, error: "Could not start payment. Please try again." });
    }
  }

  /* ── Legacy: direct checkout with subtotal (admin / special flows) ── */
  const service = safeText(payload?.service, 120);
  const date = safeText(payload?.date, 80);
  const time = safeText(payload?.time, 40);
  const firstName = safeText(payload?.firstName, 80);
  const lastName = safeText(payload?.lastName, 80);
  const phone = safeText(payload?.phone, 40);
  const email = safeText(payload?.email, 120);
  const notes = safeText(payload?.notes, 3000);
  const consent = Boolean(payload?.consent);
  const subtotalGBP = Number(payload?.subtotalGBP);
  const providerId = payload?.providerId ? String(payload.providerId) : "";

  if (!service || !date || !time) return endJson(res, 400, { ok: false, error: "Missing service/date/time" });
  if (!firstName || !lastName) return endJson(res, 400, { ok: false, error: "Missing name" });
  if (!phone) return endJson(res, 400, { ok: false, error: "Missing phone" });
  if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Invalid email" });
  if (!consent) return endJson(res, 400, { ok: false, error: "Consent is required" });
  if (!Number.isFinite(subtotalGBP) || subtotalGBP < 5 || subtotalGBP > 5000) {
    return endJson(res, 400, { ok: false, error: "Enter a valid service total between £5 and £5,000" });
  }

  const fee = Math.round(subtotalGBP * 0.15 * 100) / 100;
  const total = Math.round((subtotalGBP + fee) * 100) / 100;
  const unitAmountPence = Math.round(total * 100);
  if (unitAmountPence < 30) return endJson(res, 400, { ok: false, error: "Amount too small" });

  const ref = `CS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const record = {
    ref,
    createdAt,
    status: "awaiting_payment",
    service,
    price: `£${total.toFixed(2)} card`,
    subtotalGBP,
    platformFeeGBP: fee,
    totalGBP: total,
    dur: "",
    date,
    time,
    firstName,
    lastName,
    phone,
    email,
    notes,
    paymentProvider: "stripe_checkout",
  };

  const connectedAccountId = await resolveConnectAccount(providerId);
  const providerSharePence = Math.round(subtotalGBP * 100);

  const paymentIntentData = {
    metadata: { bookingRef: ref },
  };

  if (connectedAccountId) {
    paymentIntentData.transfer_data = {
      destination: connectedAccountId,
      amount: providerSharePence,
    };
  }

  try {
    await addBooking(record);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Clip Services — ${service.slice(0, 70)}`,
              description: `Booking ${ref}. Total payable £${total.toFixed(2)} (includes service charge).`,
            },
            unit_amount: unitAmountPence,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/clip-services-marketplace.html?booking=paid&ref=${encodeURIComponent(ref)}`,
      cancel_url: `${origin}/clip-services-marketplace.html?booking=cancel&ref=${encodeURIComponent(ref)}`,
      customer_email: email.trim(),
      client_reference_id: ref,
      metadata: { bookingRef: ref },
      payment_intent_data: paymentIntentData,
    });

    if (!session.url) {
      return endJson(res, 500, { ok: false, error: "No checkout URL returned" });
    }

    void Promise.allSettled([
      notifyCheckoutStartedCustomer(record, session.url),
      notifyCheckoutStartedAdmin(record),
    ]);

    return endJson(res, 200, { ok: true, url: session.url, ref });
  } catch (e) {
    console.error("STRIPE_CHECKOUT_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Could not start payment. Please try again." });
  }
}
