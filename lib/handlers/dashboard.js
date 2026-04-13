import {
  getBookingsByEmail,
  getNegotiationsByEmail,
  getBookings,
  getNegotiations,
  getMarketplaceListings,
} from "../kv-store.js";
import { getProviderSessionEmailFromReq } from "../provider-session.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get("role") || "";

  try {
    if (role === "customer") {
      const email = (url.searchParams.get("email") || "").trim().toLowerCase();
      if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Valid email required" });
      const bookings = await getBookingsByEmail(email);
      const negotiations = await getNegotiationsByEmail(email);
      const safeBookings = bookings.map((b) => ({
        ref: b.ref,
        service: b.service,
        date: b.date,
        time: b.time,
        status: b.status,
        createdAt: b.createdAt,
        negotiationId: b.negotiationId || null,
        agreedPrice: b.agreedPrice || null,
        providerId: b.providerId || null,
      }));
      const safeNegotiations = negotiations.filter(
        (n) => String(n.customerEmail).toLowerCase() === email
      ).map((n) => ({
        id: n.id,
        service: n.service,
        status: n.status,
        agreedPrice: n.agreedPrice,
        messages: n.messages,
        providerName: n.providerName || "",
        negotiationEnabled: n.negotiationEnabled !== false,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        bookingRef: n.bookingRef,
      }));
      return endJson(res, 200, { ok: true, bookings: safeBookings, negotiations: safeNegotiations });
    }

    if (role === "provider") {
      const email = getProviderSessionEmailFromReq(req);
      if (!email) {
        return endJson(res, 401, { ok: false, error: "Provider sign-in required", code: "PROVIDER_AUTH" });
      }
      const negotiations = await getNegotiationsByEmail(email);
      const providerNegs = negotiations.filter(
        (n) => String(n.providerEmail).toLowerCase() === email
      ).map((n) => ({
        id: n.id,
        service: n.service,
        status: n.status,
        agreedPrice: n.agreedPrice,
        messages: n.messages,
        customerName: n.customerName,
        customerPhone: n.customerPhone,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        bookingRef: n.bookingRef,
      }));

      const allBookings = await getBookings();
      const providerBookings = allBookings
        .filter((b) => {
          const negForBooking = negotiations.find(
            (n) => n.bookingRef === b.ref && String(n.providerEmail).toLowerCase() === email
          );
          return !!negForBooking;
        })
        .map((b) => ({
          ref: b.ref,
          service: b.service,
          date: b.date,
          time: b.time,
          status: b.status,
          createdAt: b.createdAt,
          agreedPrice: b.agreedPrice || null,
          customerName: `${b.firstName || ""} ${b.lastName || ""}`.trim(),
        }));

      let listings = [];
      try {
        const all = await getMarketplaceListings();
        listings = all
          .filter((x) => String(x?.email || "").toLowerCase() === email)
          .map((x) => ({
            id: x.id,
            role: x.role,
            negotiationEnabled: x.negotiationEnabled !== false,
          }));
      } catch (e) {
        console.warn("DASHBOARD_LISTINGS", e?.message);
      }

      return endJson(res, 200, {
        ok: true,
        sessionEmail: email,
        negotiations: providerNegs,
        bookings: providerBookings,
        listings,
      });
    }

    return endJson(res, 400, { ok: false, error: "role must be 'customer' or 'provider'" });
  } catch (e) {
    console.error("DASHBOARD_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load dashboard data" });
  }
}
