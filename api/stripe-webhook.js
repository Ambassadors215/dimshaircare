import Stripe from "stripe";
import { patchBooking } from "../lib/kv-store.js";

function readBody(req, limitBytes = 512 * 1024) {
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
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sk = process.env.STRIPE_SECRET_KEY;
  if (!secret || !sk) {
    res.statusCode = 500;
    res.end("Webhook not configured");
    return;
  }

  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.statusCode = 400;
    res.end("Missing stripe-signature");
    return;
  }

  let raw;
  try {
    raw = await readBody(req);
  } catch {
    res.statusCode = 400;
    res.end("Bad body");
    return;
  }

  const stripe = new Stripe(sk);
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("WEBHOOK_SIG", err.message);
    res.statusCode = 400;
    res.end(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const ref = session.metadata?.bookingRef || session.client_reference_id;
    if (ref) {
      try {
        await patchBooking(String(ref), {
          status: "paid",
          paidAt: new Date().toISOString(),
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent ? String(session.payment_intent) : "",
        });
      } catch (e) {
        console.error("WEBHOOK_PATCH", e);
      }
    }
  }

  res.setHeader("content-type", "application/json; charset=utf-8");
  res.statusCode = 200;
  res.end(JSON.stringify({ received: true }));
}
