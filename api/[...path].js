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
import sitemap from "../lib/handlers/sitemap.js";
import storeHtml from "../lib/handlers/store-html.js";
import cityHtml from "../lib/handlers/city-html.js";
import categoryHtml from "../lib/handlers/category-html.js";
import productHtml from "../lib/handlers/product-html.js";
import communityHtml from "../lib/handlers/community-html.js";
import productSeoHtml from "../lib/handlers/product-seo-html.js";
import blogHtml from "../lib/handlers/blog-html.js";
import storeApplication from "../lib/handlers/store-application.js";
import onboardingTrack from "../lib/handlers/onboarding-track.js";
import storeOwnerApi from "../lib/handlers/store-owner-api.js";
import storeAnalytics from "../lib/handlers/store-analytics.js";
import orderPublic from "../lib/handlers/order-public.js";
import searchApi from "../lib/handlers/search-api.js";

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
  sitemap,
  "store-html": storeHtml,
  "city-html": cityHtml,
  "category-html": categoryHtml,
  "product-html": productHtml,
  "community-html": communityHtml,
  "product-seo-html": productSeoHtml,
  "blog-html": blogHtml,
  "store-application": storeApplication,
  "onboarding-track": onboardingTrack,
  "store-owner": storeOwnerApi,
  "store-analytics": storeAnalytics,
  "order-public": orderPublic,
  search: searchApi,
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
