import crypto from "node:crypto";
import Redis from "ioredis";
import { publicStoreSlug } from "./seo-html.js";

/** Must match Vercel env `KV_PREFIX` (see .env.example). Legacy: set KV_PREFIX=dhc if your data was stored under the old default. */
const PREFIX = process.env.KV_PREFIX || "cs";
const KEY_BOOKINGS = `${PREFIX}:bookings`;
const KEY_CONTACTS = `${PREFIX}:contacts`;
const KEY_PUSH_CUSTOMER = `${PREFIX}:push:customer`;
const KEY_PUSH_ADMIN = `${PREFIX}:push:admin`;
const MAX_PUSH_PER_EMAIL = 8;

function normPushEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
}

function pushUserRedisKey(email) {
  return `${PREFIX}:push:user:${normPushEmail(email)}`;
}

function pushProviderRedisKey(email) {
  return `${PREFIX}:push:provider:${normPushEmail(email)}`;
}
const KEY_PROVIDERS = `${PREFIX}:providers`;
const KEY_NEGOTIATIONS = `${PREFIX}:negotiations`;
const KEY_MARKETPLACE_LISTINGS = `${PREFIX}:marketplace_listings`;
const KEY_ONBOARDING_APPLICATIONS = `${PREFIX}:onboarding_applications`;
const KEY_ONBOARDING_ANALYTICS = `${PREFIX}:onboarding_analytics`;
const KEY_SITE_VISITS = `${PREFIX}:site_visits`;
const MAX_SITE_VISITS = 8000;
const MAX_PUSH_SUBS = 40;

function getClient() {
  const url = process.env.KV_REDIS_URL;
  if (!url) throw new Error("KV_REDIS_URL not configured");
  return new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    connectTimeout: 15_000,
    commandTimeout: 12_000,
  });
}

async function withRedis(fn) {
  const client = getClient();
  try {
    await client.connect();
    return await fn(client);
  } finally {
    client.disconnect();
  }
}

export async function getBookings() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  });
}

export async function addBooking(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    await client.set(KEY_BOOKINGS, JSON.stringify(list));
  });
}

export async function updateBookingStatus(ref, status) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex((b) => String(b?.ref) === ref);
    if (i < 0) return false;
    list[i] = { ...list[i], status };
    await client.set(KEY_BOOKINGS, JSON.stringify(list));
    return true;
  });
}

export async function patchBooking(ref, patch) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex((b) => String(b?.ref) === ref);
    if (i < 0) return false;
    list[i] = { ...list[i], ...patch };
    await client.set(KEY_BOOKINGS, JSON.stringify(list));
    return true;
  });
}

export async function getContacts() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CONTACTS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  });
}

export async function addContact(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_CONTACTS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    await client.set(KEY_CONTACTS, JSON.stringify(list));
  });
}

export async function getBookingByRef(ref) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_BOOKINGS);
    const list = raw ? JSON.parse(raw) : [];
    return list.find((b) => String(b?.ref) === String(ref)) || null;
  });
}

function pushKey(role) {
  return role === "admin" ? KEY_PUSH_ADMIN : KEY_PUSH_CUSTOMER;
}

export async function getPushSubscriptions(role) {
  return withRedis(async (client) => {
    const raw = await client.get(pushKey(role));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

export async function addPushSubscription(role, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid subscription");
  }
  return withRedis(async (client) => {
    const key = pushKey(role);
    const raw = await client.get(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter((s) => s?.endpoint !== subscription.endpoint);
    list.unshift(subscription);
    if (list.length > MAX_PUSH_SUBS) list = list.slice(0, MAX_PUSH_SUBS);
    await client.set(key, JSON.stringify(list));
  });
}

export async function removePushSubscription(role, endpoint) {
  return withRedis(async (client) => {
    const key = pushKey(role);
    const raw = await client.get(key);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    list = list.filter((s) => s?.endpoint !== endpoint);
    await client.set(key, JSON.stringify(list));
  });
}

/** @param {'user'|'provider'} kind */
export async function getPushSubscriptionsForEmail(email, kind) {
  const e = normPushEmail(email);
  if (!e) return [];
  const redisKey = kind === "provider" ? pushProviderRedisKey(e) : pushUserRedisKey(e);
  return withRedis(async (client) => {
    const raw = await client.get(redisKey);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

/** @param {'user'|'provider'} kind */
export async function addPushSubscriptionForEmail(email, kind, subscription) {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error("Invalid subscription");
  }
  const e = normPushEmail(email);
  if (!e) throw new Error("Email required");
  const redisKey = kind === "provider" ? pushProviderRedisKey(e) : pushUserRedisKey(e);
  return withRedis(async (client) => {
    const raw = await client.get(redisKey);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list = list.filter((s) => s?.endpoint !== subscription.endpoint);
    list.unshift(subscription);
    if (list.length > MAX_PUSH_PER_EMAIL) list = list.slice(0, MAX_PUSH_PER_EMAIL);
    await client.set(redisKey, JSON.stringify(list));
  });
}

/** @param {'user'|'provider'} kind */
export async function removePushSubscriptionForEmail(email, kind, endpoint) {
  const e = normPushEmail(email);
  if (!e) return;
  const redisKey = kind === "provider" ? pushProviderRedisKey(e) : pushUserRedisKey(e);
  return withRedis(async (client) => {
    const raw = await client.get(redisKey);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return;
    list = list.filter((s) => s?.endpoint !== endpoint);
    await client.set(redisKey, JSON.stringify(list));
  });
}

export async function getProviders() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_PROVIDERS);
    return raw ? JSON.parse(raw) : {};
  });
}

export async function getProvider(id) {
  const providers = await getProviders();
  return providers[String(id)] || null;
}

export async function upsertProvider(id, data) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_PROVIDERS);
    const providers = raw ? JSON.parse(raw) : {};
    providers[String(id)] = { ...(providers[String(id)] || {}), ...data, updatedAt: new Date().toISOString() };
    await client.set(KEY_PROVIDERS, JSON.stringify(providers));
    return providers[String(id)];
  });
}

/* ── Marketplace listings (customer-facing service cards; email kept server-side only) ── */

export async function getMarketplaceListings() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_MARKETPLACE_LISTINGS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

export async function getMarketplaceListingById(id) {
  const list = await getMarketplaceListings();
  return list.find((x) => String(x?.id) === String(id)) || null;
}

/** Resolve /stores/[slug] — uses same slug algorithm as sitemap and store pages. */
export async function getMarketplaceListingByPublicSlug(slug) {
  const want = String(slug || "")
    .toLowerCase()
    .trim();
  if (!want) return null;
  const list = await getMarketplaceListings();
  return list.find((x) => publicStoreSlug(x) === want) || null;
}

export async function upsertMarketplaceListing(record) {
  const id = String(record?.id || "").trim();
  if (!id) throw new Error("Listing id required");
  return withRedis(async (client) => {
    const raw = await client.get(KEY_MARKETPLACE_LISTINGS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    const i = list.findIndex((x) => String(x?.id) === id);
    const prev = i >= 0 ? list[i] : {};
    const priceListIn = Array.isArray(record.priceList) ? record.priceList : prev.priceList;
    const priceList = Array.isArray(priceListIn)
      ? priceListIn
          .slice(0, 20)
          .map((row) => ({
            item: String(row?.item || "").trim().slice(0, 120),
            price: String(row?.price || "").trim().slice(0, 40),
          }))
          .filter((x) => x.item && x.price)
      : [];
    const negotiationEnabled =
      record.negotiationEnabled === undefined || record.negotiationEnabled === null
        ? prev.negotiationEnabled !== false
        : Boolean(record.negotiationEnabled);
    const row = {
      id,
      email: String(record.email || "").trim().toLowerCase(),
      role: String(record.role || "").slice(0, 200),
      bio: String(record.bio || "").slice(0, 4000),
      services: Array.isArray(record.services)
        ? record.services.map((s) => String(s).slice(0, 120)).filter(Boolean).slice(0, 40)
        : Array.isArray(prev.services)
          ? prev.services
          : [],
      category: String(record.category || "runner").slice(0, 40),
      icon: String(record.icon || "plus").slice(0, 40),
      popular: Boolean(record.popular),
      negotiationEnabled,
      priceList,
      updatedAt: new Date().toISOString(),
    };
    const opt = [
      "applicationStatus",
      "applicationRef",
      "onboardingFlow",
      "city",
      "postcode",
      "storeType",
      "fulfilment",
      "ownerName",
      "whatsappPhone",
    ];
    for (const k of opt) {
      if (record[k] !== undefined && record[k] !== null && record[k] !== "") {
        row[k] = typeof record[k] === "string" ? record[k].trim().slice(0, 500) : record[k];
      }
    }
    if (!row.email || !row.role) throw new Error("Email and display name required");
    if (i >= 0) list[i] = { ...list[i], ...row };
    else list.unshift({ ...row, publishedAt: new Date().toISOString() });
    await client.set(KEY_MARKETPLACE_LISTINGS, JSON.stringify(list));
    return row;
  });
}

export async function removeMarketplaceListing(id) {
  const sid = String(id || "").trim();
  if (!sid) return false;
  return withRedis(async (client) => {
    const raw = await client.get(KEY_MARKETPLACE_LISTINGS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    const next = list.filter((x) => String(x?.id) !== sid);
    if (next.length === list.length) return false;
    await client.set(KEY_MARKETPLACE_LISTINGS, JSON.stringify(next));
    return true;
  });
}

/* ── Negotiations ── */

export async function getNegotiations() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
  });
}

export async function addNegotiation(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    await client.set(KEY_NEGOTIATIONS, JSON.stringify(list));
  });
}

export async function getNegotiationById(negId) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const list = raw ? JSON.parse(raw) : [];
    return list.find((n) => String(n?.id) === String(negId)) || null;
  });
}

export async function patchNegotiation(negId, patch) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_NEGOTIATIONS);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex((n) => String(n?.id) === String(negId));
    if (i < 0) return null;
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() };
    await client.set(KEY_NEGOTIATIONS, JSON.stringify(list));
    return list[i];
  });
}

export async function getNegotiationsByEmail(email) {
  const all = await getNegotiations();
  const e = String(email).toLowerCase().trim();
  return all.filter(
    (n) => String(n.customerEmail).toLowerCase() === e || String(n.providerEmail).toLowerCase() === e
  );
}

export async function getBookingsByEmail(email) {
  const all = await getBookings();
  const e = String(email).toLowerCase().trim();
  return all.filter((b) => String(b.email).toLowerCase() === e);
}

export async function appendSiteVisit(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_SITE_VISITS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(record);
    if (list.length > MAX_SITE_VISITS) list = list.slice(0, MAX_SITE_VISITS);
    await client.set(KEY_SITE_VISITS, JSON.stringify(list));
  });
}

export async function getRecentSiteVisits(limit = 500) {
  const n = Math.min(Math.max(Number(limit) || 500, 1), 2000);
  return withRedis(async (client) => {
    const raw = await client.get(KEY_SITE_VISITS);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.slice(0, n);
  });
}

const KEY_PROVIDER_OTP = (email) => `${PREFIX}:provider_otp:${normPushEmail(email)}`;
const KEY_OTP_COOLDOWN = (email) => `${PREFIX}:provider_otp_cd:${normPushEmail(email)}`;

function otpPepper() {
  return process.env.SESSION_SECRET || "dev-otp-pepper-change-me";
}

function hashOtpCode(code) {
  return crypto.createHash("sha256").update(String(code) + otpPepper()).digest("hex");
}

export async function isProviderOtpInCooldown(email) {
  const e = normPushEmail(email);
  if (!e) return true;
  return withRedis(async (client) => Boolean(await client.get(KEY_OTP_COOLDOWN(e))));
}

export async function setProviderOtpCooldown(email, sec = 45) {
  const e = normPushEmail(email);
  if (!e) return;
  return withRedis(async (client) => {
    await client.setex(KEY_OTP_COOLDOWN(e), sec, "1");
  });
}

export async function setProviderOtp(email, code, ttlSec = 900) {
  const e = normPushEmail(email);
  const hash = hashOtpCode(code);
  return withRedis(async (client) => {
    await client.setex(KEY_PROVIDER_OTP(e), ttlSec, JSON.stringify({ hash }));
  });
}

export async function verifyAndConsumeProviderOtp(email, code) {
  const e = normPushEmail(email);
  const want = hashOtpCode(code);
  return withRedis(async (client) => {
    const key = KEY_PROVIDER_OTP(e);
    const raw = await client.get(key);
    if (!raw) return false;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }
    const ok = parsed?.hash === want;
    if (ok) await client.del(key);
    return ok;
  });
}

/** Listings visible on public directory / SEO (hide draft applications). */
export function isListingPubliclyVisible(listing) {
  return listing?.applicationStatus !== "pending";
}

export async function addOnboardingApplication(record) {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_APPLICATIONS);
    let list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list.unshift(record);
    if (list.length > 500) list = list.slice(0, 500);
    await client.set(KEY_ONBOARDING_APPLICATIONS, JSON.stringify(list));
  });
}

export async function getOnboardingApplications() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_APPLICATIONS);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  });
}

const ANALYTICS_KEYS = [
  "viewsStoreApply",
  "viewsStallApply",
  "submissionsStore",
  "submissionsStall",
];

export async function incrementOnboardingMetric(key) {
  if (!ANALYTICS_KEYS.includes(key)) return;
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_ANALYTICS);
    let o = raw ? JSON.parse(raw) : {};
    if (typeof o !== "object" || !o) o = {};
    o[key] = Number(o[key] || 0) + 1;
    o.updatedAt = new Date().toISOString();
    await client.set(KEY_ONBOARDING_ANALYTICS, JSON.stringify(o));
  });
}

export async function getOnboardingAnalyticsCounters() {
  return withRedis(async (client) => {
    const raw = await client.get(KEY_ONBOARDING_ANALYTICS);
    let o = raw ? JSON.parse(raw) : {};
    if (typeof o !== "object" || !o) o = {};
    const out = {};
    for (const k of ANALYTICS_KEYS) {
      out[k] = Number(o[k] || 0);
    }
    out.updatedAt = o.updatedAt || null;
    return out;
  });
}
