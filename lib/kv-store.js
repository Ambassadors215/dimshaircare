/**
 * Vercel KV storage for bookings and contacts.
 * Requires Vercel KV to be linked to the project (Storage tab).
 */
import { kv } from "@vercel/kv";

const KEY_BOOKINGS = "dhc:bookings";
const KEY_CONTACTS = "dhc:contacts";

export async function getBookings() {
  try {
    const raw = await kv.get(KEY_BOOKINGS);
    const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw || "[]") : [];
    return arr.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  } catch {
    return [];
  }
}

export async function addBooking(record) {
  const list = await getBookings();
  list.unshift(record);
  await kv.set(KEY_BOOKINGS, JSON.stringify(list));
}

export async function updateBookingStatus(ref, status) {
  const list = await getBookings();
  const i = list.findIndex((b) => String(b?.ref) === ref);
  if (i < 0) return false;
  list[i] = { ...list[i], status };
  await kv.set(KEY_BOOKINGS, JSON.stringify(list));
  return true;
}

export async function getContacts() {
  try {
    const raw = await kv.get(KEY_CONTACTS);
    const arr = Array.isArray(raw) ? raw : typeof raw === "string" ? JSON.parse(raw || "[]") : [];
    return arr.sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));
  } catch {
    return [];
  }
}

export async function addContact(record) {
  const list = await getContacts();
  list.unshift(record);
  await kv.set(KEY_CONTACTS, JSON.stringify(list));
}
