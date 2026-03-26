import Redis from "ioredis";

const PREFIX = process.env.KV_PREFIX || "dhc";
const KEY_BOOKINGS = `${PREFIX}:bookings`;
const KEY_CONTACTS = `${PREFIX}:contacts`;

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
