import Stripe from "stripe";
import {
  getBookingByRef,
  getNegotiationById,
  patchBooking,
  patchNegotiation,
  getProviders,
  upsertProvider,
} from "../lib/kv-store.js";
import {
  notifyPaymentSucceededAdmin,
  notifyPaymentSucceededCustomer,
  notifyPaymentSucceededProvider,
} from "../lib/notify.js";

export const config = {
  api: { bodyParser: false },
};

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
    const negotiationId = session.metadata?.negotiationId;
    if (ref) {
      try {
        await patchBooking(String(ref), {
          status: "paid",
          paidAt: new Date().toISOString(),
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent ? String(session.payment_intent) : "",
        });
        if (negotiationId) {
          try {
            await patchNegotiation(String(negotiationId), { status: "paid" });
          } catch (e) {
            console.error("WEBHOOK_NEG_PATCH", e);
          }
        }
        const booking = await getBookingByRef(String(ref));
        if (booking) {
          let providerEmail = "";
          const negId = negotiationId || booking.negotiationId;
          if (negId) {
            try {
              const neg = await getNegotiationById(String(negId));
              if (neg?.providerEmail) providerEmail = String(neg.providerEmail).trim();
            } catch (e) {
              console.error("WEBHOOK_NEG_LOOKUP", e);
            }
          }
          void Promise.allSettled([
            notifyPaymentSucceededCustomer(booking),
            notifyPaymentSucceededAdmin(booking),
            providerEmail ? notifyPaymentSucceededProvider(providerEmail, booking) : Promise.resolve(),
          ]);
        }
      } catch (e) {
        console.error("WEBHOOK_PATCH", e);
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    if (account.charges_enabled && account.payouts_enabled) {
      try {
        const providers = await getProviders();
        for (const [id, p] of Object.entries(providers)) {
          if (p.stripeAccountId === account.id && !p.onboarded) {
            await upsertProvider(id, { onboarded: true });
            console.log(`CONNECT: Provider ${id} onboarding complete (${account.id})`);
            break;
          }
        }
      } catch (e) {
        console.error("WEBHOOK_ACCOUNT_UPDATED", e);
      }
    }
  }

  res.setHeader("content-type", "application/json; charset=utf-8");
  res.statusCode = 200;
  res.end(JSON.stringify({ received: true }));
}
