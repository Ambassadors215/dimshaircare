/**
 * Single Vercel Serverless entry for all /api/* routes (except /api/admin/*).
 * Hobby plan limits deployments to 12 functions — one catch-all keeps us under the cap.
 */
import booking from "../lib/handlers/booking.js";
import contact from "../lib/handlers/contact.js";
import listings from "../lib/handlers/listings.js";
import pushVapid from "../lib/handlers/push-vapid.js";
import pushSubscribe from "../lib/handlers/push-subscribe.js";
import providerAuth from "../lib/handlers/provider-auth.js";
import dashboard from "../lib/handlers/dashboard.js";
import negotiate from "../lib/handlers/negotiate.js";
import connect from "../lib/handlers/connect.js";
import stripeWebhook from "../lib/handlers/stripe-webhook.js";
import stripeCheckout from "../lib/handlers/stripe-checkout.js";
import trackVisit from "../lib/handlers/track-visit.js";
import publicStats from "../lib/handlers/public-stats.js";

const handlers = {
  booking,
  contact,
  listings,
  "push-vapid": pushVapid,
  "push-subscribe": pushSubscribe,
  "provider-auth": providerAuth,
  dashboard,
  negotiate,
  connect,
  "stripe-webhook": stripeWebhook,
  "stripe-checkout": stripeCheckout,
  "track-visit": trackVisit,
  "public-stats": publicStats,
};

function notFound(res) {
  res.statusCode = 404;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
}

export default async function handler(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const parts = url.pathname.replace(/^\/api\/?/i, "").split("/").filter(Boolean);
  const key = parts[0] || "";
  const fn = handlers[key];
  if (!fn) return notFound(res);
  return fn(req, res);
}
