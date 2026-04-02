import Redis from "ioredis";

/** Must match Vercel env `KV_PREFIX` (see .env.example). Legacy: set KV_PREFIX=dhc if your data was stored under the old default. */
const PREFIX = process.env.KV_PREFIX || "cs";
const KEY_BOOKINGS = `${PREFIX}:bookings`;
const KEY_CONTACTS = `${PREFIX}:contacts`;
const KEY_PUSH_CUSTOMER = `${PREFIX}:push:customer`;
const KEY_PUSH_ADMIN = `${PREFIX}:push:admin`;
const KEY_PROVIDERS = `${PREFIX}:providers`;
const MAX_PUSH_SUBS = 40;

function getClient() {
  const url = process.env.KV_REDIS_URL;
  if (!url) throw new Error("KV_REDIS_URL not configured");
  return new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
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
