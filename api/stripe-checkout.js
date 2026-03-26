import Stripe from "stripe";
import { addBooking } from "../lib/kv-store.js";

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
    price: `£${total.toFixed(2)} card (incl. 15% fee)`,
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

  const origin = siteOrigin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
              description: `Booking ${ref}. Service £${subtotalGBP.toFixed(2)} + 15% platform fee £${fee.toFixed(2)}.`,
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
      payment_intent_data: {
        metadata: { bookingRef: ref },
      },
    });

    if (!session.url) {
      return endJson(res, 500, { ok: false, error: "No checkout URL returned" });
    }

    return endJson(res, 200, { ok: true, url: session.url, ref });
  } catch (e) {
    console.error("STRIPE_CHECKOUT_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Could not start payment. Try again or use WhatsApp." });
  }
}
