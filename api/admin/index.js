import { endJson, readBody, requireAdmin } from "./_utils.js";
import {
  getBookings,
  getContacts,
  getProviders,
  getBookingByRef,
  updateBookingStatus,
  getNegotiations,
  getMarketplaceListings,
  upsertMarketplaceListing,
  removeMarketplaceListing,
} from "../../lib/kv-store.js";
import { notifyBookingStatusCustomer } from "../../lib/notify.js";

async function handlePing(req, res) {
  return endJson(res, 200, { ok: true });
}

async function handleBookings(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getBookings();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_BOOKINGS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load bookings" });
  }
}

async function handleContacts(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getContacts();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_CONTACTS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load contacts" });
  }
}

async function handleProviders(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const providers = await getProviders();
    return endJson(res, 200, { ok: true, providers });
  } catch (e) {
    console.error("ADMIN_PROVIDERS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load providers" });
  }
}

async function handleUpdateBooking(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const ref = String(payload?.ref || "").trim();
  const status = String(payload?.status || "").trim();
  const allowed = new Set(["new", "awaiting_payment", "paid", "confirmed", "completed", "cancelled"]);
  if (!ref) return endJson(res, 400, { ok: false, error: "Missing ref" });
  if (!allowed.has(status)) return endJson(res, 400, { ok: false, error: "Invalid status" });
  try {
    const before = await getBookingByRef(ref);
    const updated = await updateBookingStatus(ref, status);
    if (!updated) return endJson(res, 404, { ok: false, error: "Booking not found" });
    const notifyCustomer =
      before &&
      before.status !== status &&
      ["confirmed", "completed", "cancelled", "paid"].includes(status);
    if (notifyCustomer) {
      const booking = await getBookingByRef(ref);
      if (booking) void notifyBookingStatusCustomer(booking, status).catch((e) => console.error("NOTIFY_STATUS", e));
    }
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_UPDATE_BOOKING_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to update" });
  }
}

async function handleNegotiations(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getNegotiations();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_NEGOTIATIONS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load negotiations" });
  }
}

async function handleMarketplace(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const items = await getMarketplaceListings();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_MARKETPLACE_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load marketplace listings" });
  }
}

async function handleMarketplacePublish(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const id = String(payload?.id || "").trim().slice(0, 32);
  const email = String(payload?.email || "").trim().slice(0, 120);
  const role = String(payload?.role || "").trim().slice(0, 200);
  const bio = String(payload?.bio || "").trim().slice(0, 4000);
  const category = String(payload?.category || "runner").trim().slice(0, 40);
  const icon = String(payload?.icon || "plus").trim().slice(0, 40);
  const popular = Boolean(payload?.popular);
  let services = payload?.services;
  if (typeof services === "string") {
    services = services.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(services)) services = [];
  if (!id || !email || !role) {
    return endJson(res, 400, { ok: false, error: "id, email, and display name (role) are required" });
  }
  try {
    await upsertMarketplaceListing({ id, email, role, bio, services, category, icon, popular });
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_MARKETPLACE_PUBLISH", e);
    return endJson(res, 400, { ok: false, error: e.message || "Publish failed" });
  }
}

async function handleMarketplaceUnpublish(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }
  const id = String(payload?.id || "").trim();
  if (!id) return endJson(res, 400, { ok: false, error: "Missing id" });
  try {
    const ok = await removeMarketplaceListing(id);
    if (!ok) return endJson(res, 404, { ok: false, error: "Listing not found" });
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_MARKETPLACE_UNPUBLISH", e);
    return endJson(res, 500, { ok: false, error: "Unpublish failed" });
  }
}

const ROUTES = {
  ping: handlePing,
  bookings: handleBookings,
  negotiations: handleNegotiations,
  marketplace: handleMarketplace,
  "marketplace-publish": handleMarketplacePublish,
  "marketplace-unpublish": handleMarketplaceUnpublish,
  contacts: handleContacts,
  providers: handleProviders,
  "update-booking": handleUpdateBooking,
};

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action") || "";

  const routeHandler = ROUTES[action];
  if (!routeHandler) {
    return endJson(res, 400, { ok: false, error: `Unknown action: ${action}` });
  }
  return routeHandler(req, res);
}
