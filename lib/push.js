import webpush from "web-push";
import {
  getPushSubscriptions,
  getPushSubscriptionsForEmail,
  removePushSubscription,
  removePushSubscriptionForEmail,
} from "./kv-store.js";

export function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_PUBLIC_KEY.length > 20
  );
}

function configureWebPush() {
  if (!isPushConfigured()) return false;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || "soniaotikpa@gmail.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function sendToSubscriptions(subs, payload, onRemoveEndpoint) {
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/clip-services-marketplace.html",
  });
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub, body, { TTL: 3600 });
      } catch (e) {
        const status = e?.statusCode;
        if (status === 404 || status === 410) {
          if (sub?.endpoint && onRemoveEndpoint) await onRemoveEndpoint(sub.endpoint);
        } else {
          console.error("PUSH_SEND_ERR", status, e?.message);
        }
      }
    })
  );
}

/**
 * @param {'admin'} role
 * @param {{ title: string; body: string; url?: string }} payload
 */
export async function notifyPushRole(role, payload) {
  if (role !== "admin" || !configureWebPush()) return;
  const subs = await getPushSubscriptions("admin");
  if (!subs.length) return;
  await sendToSubscriptions(subs, payload, (endpoint) => removePushSubscription("admin", endpoint));
}

/**
 * Customer devices registered with the same email as their dashboard / booking.
 */
export async function notifyPushUserEmail(email, payload) {
  if (!isValidEmail(email) || !configureWebPush()) return;
  const subs = await getPushSubscriptionsForEmail(email, "user");
  if (!subs.length) return;
  await sendToSubscriptions(subs, payload, (endpoint) =>
    removePushSubscriptionForEmail(email, "user", endpoint)
  );
}

/**
 * Provider devices registered with their listing email on the provider dashboard.
 */
export async function notifyPushProviderEmail(email, payload) {
  if (!isValidEmail(email) || !configureWebPush()) return;
  const subs = await getPushSubscriptionsForEmail(email, "provider");
  if (!subs.length) return;
  await sendToSubscriptions(subs, payload, (endpoint) =>
    removePushSubscriptionForEmail(email, "provider", endpoint)
  );
}
