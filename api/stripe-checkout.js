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

/** Vercel often pre-parses JSON into `req.body`; reading the stream then yields "" and breaks checkout. */
async function parseJsonBody(req) {
  const b = req.body;
  try {
    if (b != null && typeof b === "object" && !Buffer.isBuffer(b)) {
      return b;
    }
    if (typeof b === "string" && b.trim()) {
      return JSON.parse(b);
    }
    if (Buffer.isBuffer(b) && b.length) {
      return JSON.parse(b.toString("utf8"));
    }
  } catch {
    return null;
  }
  try {
    const raw = await readBody(req);
    if (!raw || !String(raw).trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeEmailInput(email) {
  if (typeof email !== "string") return "";
  return email
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const e = normalizeEmailInput(email);
  return e.length > 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
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

/**
 * With Connect, first Checkout attempt uses transfer_data. Any Stripe failure there retries once
 * without destination so customers can still pay on the platform account.
 */
async function createCheckoutSessionWithConnectFallback(stripe, params) {
  const hadTransfer = Boolean(params.payment_intent_data?.transfer_data);
  if (!hadTransfer) {
    return await stripe.checkout.sessions.create(params);
  }
  try {
    return await stripe.checkout.sessions.create(params);
  } catch (err) {
    console.warn("STRIPE_CHECKOUT_WITH_TRANSFER_FAILED", err?.type, err?.code, String(err?.message || err).slice(0, 300));
    const md = params.payment_intent_data?.metadata || {};
    const metadata = {};
    for (const [k, v] of Object.entries(md)) {
      metadata[String(k).slice(0, 40)] = String(v ?? "").replace(/\0/g, "").slice(0, 500);
    }
    return await stripe.checkout.sessions.create({
      ...params,
      payment_intent_data: { metadata },
    });
  }
}

function siteOrigin() {
  const u = process.env.SITE_URL || "https://clips-service.vercel.app";
  return String(u).replace(/\/$/, "");
}

/** Map Stripe / infra errors to a short `code` + safe message for the client (full error stays in logs). */
function publicCheckoutError(e, fallbackCode) {
  const base = {
    error: "Could not start payment. Please try again.",
    code: fallbackCode || "CHECKOUT_FAILED",
  };
  if (!e || typeof e !== "object") return base;
  const msg = String(e.message || e.raw?.message || e);
  if (e.type === "StripeAuthenticationError" || e.code === "api_key_expired") {
    return {
      error: "Stripe API key is invalid or expired. Check STRIPE_SECRET_KEY in Vercel.",
      code: "STRIPE_AUTH",
    };
  }
  if (e.type === "StripeConnectionError") {
    return { error: "Could not reach Stripe. Check your connection and try again.", code: "STRIPE_NETWORK" };
  }
  if (e.type === "StripeInvalidRequestError") {
    if (/test mode.*live mode|live mode.*test mode/i.test(msg)) {
      return {
        error: "Stripe key mode does not match your account (test vs live). Fix STRIPE_SECRET_KEY in Vercel.",
        code: "STRIPE_MODE",
      };
    }
    if (/No such destination|does not have the capability|charges_enabled|transfers/i.test(msg)) {
      return {
        error: "Card payment could not use the provider payout route. Try again or contact support.",
        code: "STRIPE_CONNECT",
      };
    }
  }
  if (msg.includes("KV_REDIS_URL") || msg.includes("ECONNREFUSED") || msg.includes("Redis")) {
    return {
      error: "Database connection failed. Check KV_REDIS_URL in Vercel.",
      code: "KV_REDIS",
    };
  }
  if (e.type && String(e.type).startsWith("Stripe")) {
    const c = e.code ? String(e.code).replace(/\W/g, "_").slice(0, 40) : "";
    return { error: base.error, code: c ? `STRIPE_${c}` : "STRIPE_ERROR" };
  }
  return base;
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

  try {
  const origin = siteOrigin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  /* ── Pay after agreed price (customer dashboard) ── */
  const negotiationId = String(payload?.negotiationId ?? "")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim()
    .slice(0, 64);
  if (negotiationId) {
    const email = normalizeEmailInput(safeText(payload?.email, 120));
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
    if (normalizeEmailInput(neg.customerEmail) !== email) {
      return endJson(res, 403, { ok: false, error: "Email does not match this request" });
    }
    if (neg.status !== "agreed" || neg.agreedPrice == null) {
      return endJson(res, 400, { ok: false, error: "Price must be agreed before payment" });
    }

    const subtotalGBP = Number(neg.agreedPrice);
    if (!Number.isFinite(subtotalGBP) || subtotalGBP < 1 || subtotalGBP > 5000) {
      return endJson(res, 400, { ok: false, error: "Invalid agreed amount" });
    }

    let booking;
    try {
      booking = await getBookingByRef(neg.bookingRef);
    } catch (e) {
      console.error("BOOKING_LOOKUP", e);
      const pub = publicCheckoutError(e, "KV_BOOKING");
      return endJson(res, 500, { ok: false, error: pub.error, code: pub.code });
    }
    if (!booking) return endJson(res, 404, { ok: false, error: "Booking not found" });

    const fee = Math.round(subtotalGBP * 0.15 * 100) / 100;
    const total = Math.round((subtotalGBP + fee) * 100) / 100;
    const unitAmountPence = Math.round(total * 100);
    if (unitAmountPence < 30) return endJson(res, 400, { ok: false, error: "Amount too small for card payment" });

    const ref = String(booking.ref);
    const providerId = String(neg.providerId || booking.providerId || "");
    const connectedAccountId = await resolveConnectAccount(providerId);
    const providerSharePence = Math.round(subtotalGBP * 100);

    const metaBookingRef = String(ref).replace(/\0/g, "").slice(0, 500);
    const metaNegId = String(negotiationId).replace(/\0/g, "").slice(0, 500);
    const paymentIntentData = {
      metadata: { bookingRef: metaBookingRef, negotiationId: metaNegId },
    };
    if (connectedAccountId) {
      paymentIntentData.transfer_data = {
        destination: connectedAccountId,
        amount: providerSharePence,
      };
    }

    const service = safeText(booking.service, 120).replace(/\0/g, "");
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
      const patched = await patchBooking(ref, {
        status: "awaiting_payment",
        subtotalGBP,
        platformFeeGBP: fee,
        totalGBP: total,
        agreedPrice: subtotalGBP,
        price: payRecord.price,
        paymentProvider: "stripe_checkout",
        negotiationId,
      });
      if (!patched) {
        return endJson(res, 500, { ok: false, error: "Could not update booking before payment." });
      }

      const session = await createCheckoutSessionWithConnectFallback(stripe, {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "gbp",
              product_data: {
                name: `Clip Services - ${service.slice(0, 70)}`,
                description: `Booking ${ref}. Total payable £${total.toFixed(2)} (includes service charge).`.slice(
                  0,
                  500
                ),
              },
              unit_amount: unitAmountPence,
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/user/?email=${encodeURIComponent(email)}&paid=1&ref=${encodeURIComponent(ref)}`,
        cancel_url: `${origin}/user/?email=${encodeURIComponent(email)}&cancel=1&ref=${encodeURIComponent(ref)}`,
        customer_email: email,
        client_reference_id: String(ref).slice(0, 200),
        metadata: { bookingRef: metaBookingRef, negotiationId: metaNegId },
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
      const pub = publicCheckoutError(e, "NEG_CHECKOUT");
      return endJson(res, 500, { ok: false, error: pub.error, code: pub.code });
    }
  }

  /* ── Legacy: direct checkout with subtotal (admin / special flows) ── */
  const service = safeText(payload?.service, 120);
  const date = safeText(payload?.date, 80);
  const time = safeText(payload?.time, 40);
  const firstName = safeText(payload?.firstName, 80);
  const lastName = safeText(payload?.lastName, 80);
  const phone = safeText(payload?.phone, 40);
  const email = normalizeEmailInput(safeText(payload?.email, 120));
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

  const legacyMetaRef = String(ref).replace(/\0/g, "").slice(0, 500);
  const paymentIntentData = {
    metadata: { bookingRef: legacyMetaRef },
  };

  if (connectedAccountId) {
    paymentIntentData.transfer_data = {
      destination: connectedAccountId,
      amount: providerSharePence,
    };
  }

  try {
    await addBooking(record);

    const session = await createCheckoutSessionWithConnectFallback(stripe, {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Clip Services - ${service.slice(0, 70)}`,
              description: `Booking ${ref}. Total payable £${total.toFixed(2)} (includes service charge).`.slice(
                0,
                500
              ),
            },
            unit_amount: unitAmountPence,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/clip-services-marketplace.html?booking=paid&ref=${encodeURIComponent(ref)}`,
      cancel_url: `${origin}/clip-services-marketplace.html?booking=cancel&ref=${encodeURIComponent(ref)}`,
      customer_email: email,
      client_reference_id: String(ref).slice(0, 200),
      metadata: { bookingRef: legacyMetaRef },
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
    const pub = publicCheckoutError(e, "LEGACY_CHECKOUT");
    return endJson(res, 500, { ok: false, error: pub.error, code: pub.code });
  }
  } catch (e) {
    console.error("STRIPE_CHECKOUT_FATAL", e);
    if (res.headersSent || res.writableEnded) return;
    const pub = publicCheckoutError(e, "CHECKOUT_FATAL");
    return endJson(res, 500, { ok: false, error: pub.error, code: pub.code });
  }
}
