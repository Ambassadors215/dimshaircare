import {
  addNegotiation,
  getNegotiationById,
  patchNegotiation,
  getBookingByRef,
  patchBooking,
  getMarketplaceListingById,
  upsertMarketplaceListing,
} from "../lib/kv-store.js";
import { notifyNegotiationUpdate } from "../lib/notify.js";

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) { reject(new Error("Payload too large")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function safe(s, max = 500) {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try { payload = JSON.parse(await readBody(req)); }
  catch { return endJson(res, 400, { ok: false, error: "Invalid JSON" }); }

  const action = safe(payload?.action, 30);

  if (action === "create") {
    const bookingRef = safe(payload?.bookingRef, 20);
    const email = safe(payload?.email, 120);
    const message = safe(payload?.message, 1000);
    if (!bookingRef) return endJson(res, 400, { ok: false, error: "Missing bookingRef" });
    if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Invalid email" });

    const booking = await getBookingByRef(bookingRef);
    if (!booking) return endJson(res, 404, { ok: false, error: "Booking not found" });
    if (String(booking.email).toLowerCase() !== email.toLowerCase()) {
      return endJson(res, 403, { ok: false, error: "Email does not match booking" });
    }

    const negId = `NEG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const neg = {
      id: negId,
      bookingRef,
      service: booking.service,
      customerEmail: booking.email,
      customerName: `${booking.firstName} ${booking.lastName}`,
      customerPhone: booking.phone,
      providerEmail: "",
      providerId: booking.providerId || "",
      status: "pending",
      messages: [{ from: "customer", type: "request", text: message || booking.service, ts: now }],
      agreedPrice: null,
      createdAt: now,
      updatedAt: now,
    };
    await addNegotiation(neg);
    await patchBooking(bookingRef, { negotiationId: negId, status: "negotiating" });
    return endJson(res, 200, { ok: true, negotiationId: negId });
  }

  if (action === "offer" || action === "counter") {
    const negId = safe(payload?.negotiationId, 20);
    const email = safe(payload?.email, 120);
    const amount = Number(payload?.amount);
    const message = safe(payload?.message, 1000);
    if (!negId) return endJson(res, 400, { ok: false, error: "Missing negotiationId" });
    if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Invalid email" });
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return endJson(res, 400, { ok: false, error: "Amount must be between £1 and £10,000" });
    }

    const neg = await getNegotiationById(negId);
    if (!neg) return endJson(res, 404, { ok: false, error: "Negotiation not found" });

    const isProvider = String(neg.providerEmail).toLowerCase() === email.toLowerCase();
    const isCustomer = String(neg.customerEmail).toLowerCase() === email.toLowerCase();
    if (!isProvider && !isCustomer) return endJson(res, 403, { ok: false, error: "Unauthorized" });

    if (action === "counter" && isCustomer && neg.negotiationEnabled === false) {
      return endJson(res, 400, {
        ok: false,
        error: "This provider has set fixed pricing — customer counter-offers are disabled. You can accept or decline their offer.",
      });
    }

    const from = isProvider ? "provider" : "customer";
    const msgs = [...(neg.messages || []), { from, type: action, amount, text: message, ts: new Date().toISOString() }];
    await patchNegotiation(negId, { messages: msgs, status: "negotiating" });

    const recipientEmail = isProvider ? neg.customerEmail : neg.providerEmail;
    if (recipientEmail) {
      void notifyNegotiationUpdate({ ...neg, messages: msgs }, action, recipientEmail).catch(console.error);
    }
    return endJson(res, 200, { ok: true });
  }

  if (action === "accept") {
    const negId = safe(payload?.negotiationId, 20);
    const email = safe(payload?.email, 120);
    if (!negId || !isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Missing fields" });

    const neg = await getNegotiationById(negId);
    if (!neg) return endJson(res, 404, { ok: false, error: "Negotiation not found" });

    const isProvider = String(neg.providerEmail).toLowerCase() === email.toLowerCase();
    const isCustomer = String(neg.customerEmail).toLowerCase() === email.toLowerCase();
    if (!isProvider && !isCustomer) return endJson(res, 403, { ok: false, error: "Unauthorized" });

    const lastOffer = [...(neg.messages || [])].reverse().find((m) => m.type === "offer" || m.type === "counter");
    if (!lastOffer?.amount) return endJson(res, 400, { ok: false, error: "No offer to accept" });

    const msgs = [...(neg.messages || []), { from: isProvider ? "provider" : "customer", type: "accept", amount: lastOffer.amount, ts: new Date().toISOString() }];
    await patchNegotiation(negId, { messages: msgs, status: "agreed", agreedPrice: lastOffer.amount });

    if (neg.bookingRef) {
      await patchBooking(neg.bookingRef, { status: "awaiting_payment", agreedPrice: lastOffer.amount, negotiationId: negId });
    }

    const recipientEmail = isProvider ? neg.customerEmail : neg.providerEmail;
    if (recipientEmail) {
      void notifyNegotiationUpdate({ ...neg, messages: msgs, agreedPrice: lastOffer.amount }, "accepted", recipientEmail).catch(console.error);
    }
    return endJson(res, 200, { ok: true, agreedPrice: lastOffer.amount });
  }

  if (action === "decline") {
    const negId = safe(payload?.negotiationId, 20);
    const email = safe(payload?.email, 120);
    if (!negId || !isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Missing fields" });

    const neg = await getNegotiationById(negId);
    if (!neg) return endJson(res, 404, { ok: false, error: "Negotiation not found" });

    const isProvider = String(neg.providerEmail).toLowerCase() === email.toLowerCase();
    const isCustomer = String(neg.customerEmail).toLowerCase() === email.toLowerCase();
    if (!isProvider && !isCustomer) return endJson(res, 403, { ok: false, error: "Unauthorized" });

    const msgs = [...(neg.messages || []), { from: isProvider ? "provider" : "customer", type: "decline", ts: new Date().toISOString() }];
    await patchNegotiation(negId, { messages: msgs, status: "declined" });

    const recipientEmail = isProvider ? neg.customerEmail : neg.providerEmail;
    if (recipientEmail) {
      void notifyNegotiationUpdate({ ...neg, messages: msgs }, "declined", recipientEmail).catch(console.error);
    }
    return endJson(res, 200, { ok: true });
  }

  if (action === "set-negotiation-mode") {
    const listingId = safe(payload?.listingId, 32);
    const email = safe(payload?.email, 120);
    const negotiationEnabled = Boolean(payload?.negotiationEnabled);
    if (!listingId || !isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Missing fields" });
    try {
      const row = await getMarketplaceListingById(listingId);
      if (!row || String(row.email).toLowerCase() !== email.toLowerCase()) {
        return endJson(res, 403, { ok: false, error: "Unauthorized" });
      }
      await upsertMarketplaceListing({ ...row, negotiationEnabled });
      return endJson(res, 200, { ok: true });
    } catch (e) {
      console.error("SET_NEG_MODE", e);
      return endJson(res, 500, { ok: false, error: "Failed to update listing" });
    }
  }

  if (action === "assign-provider") {
    const token = req.headers["x-admin-token"];
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || token !== expected) return endJson(res, 401, { ok: false, error: "Unauthorized" });
    const negId = safe(payload?.negotiationId, 20);
    const providerEmail = safe(payload?.providerEmail, 120);
    if (!negId || !isValidEmail(providerEmail)) return endJson(res, 400, { ok: false, error: "Missing fields" });
    const neg = await getNegotiationById(negId);
    if (!neg) return endJson(res, 404, { ok: false, error: "Negotiation not found" });
    await patchNegotiation(negId, { providerEmail });
    void notifyNegotiationUpdate(neg, "new_request", providerEmail).catch(console.error);
    return endJson(res, 200, { ok: true });
  }

  return endJson(res, 400, { ok: false, error: "Unknown action" });
}
