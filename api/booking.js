import { addBooking, addNegotiation, patchBooking } from "../lib/kv-store.js";
import { notifyBookingSubmittedAdmin, notifyBookingSubmittedCustomer } from "../lib/notify.js";

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function safeText(s, max = 5000) {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "Method Not Allowed" }));
    return;
  }

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw);
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const service = safeText(payload?.service, 120);
  const price = safeText(String(payload?.price ?? ""), 120);
  const dur = safeText(payload?.dur, 60);
  const date = safeText(payload?.date, 80);
  const time = safeText(payload?.time, 40);
  const firstName = safeText(payload?.firstName, 80);
  const lastName = safeText(payload?.lastName, 80);
  const phone = safeText(payload?.phone, 40);
  const email = safeText(payload?.email, 120);
  const notes = safeText(payload?.notes, 3000);
  const consent = Boolean(payload?.consent);

  if (!service || !date || !time) return endJson(res, 400, { ok: false, error: "Missing service/date/time" });
  if (!firstName || !lastName) return endJson(res, 400, { ok: false, error: "Missing name" });
  if (!phone) return endJson(res, 400, { ok: false, error: "Missing phone" });
  if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Invalid email" });
  if (!consent) return endJson(res, 400, { ok: false, error: "Consent is required" });

  const ref = `CS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  const record = {
    ref,
    createdAt,
    status: "new",
    service,
    price,
    dur,
    date,
    time,
    firstName,
    lastName,
    phone,
    email,
    notes
  };

  try {
    await addBooking(record);

    const negId = `NEG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const neg = {
      id: negId,
      bookingRef: ref,
      service,
      customerEmail: email.toLowerCase(),
      customerName: `${firstName} ${lastName}`,
      customerPhone: phone,
      providerEmail: "",
      providerName: record.notes?.match(/Provider:\s*(.+)/)?.[1] || service,
      providerId: safeText(payload?.providerId, 20),
      status: "pending",
      messages: [{ from: "customer", type: "request", text: notes || `Service request: ${service}`, ts: createdAt }],
      agreedPrice: null,
      createdAt,
      updatedAt: createdAt,
    };
    await addNegotiation(neg);
    await patchBooking(ref, { negotiationId: negId, status: "negotiating" });

    void Promise.allSettled([
      notifyBookingSubmittedCustomer(record),
      notifyBookingSubmittedAdmin(record),
    ]);
    return endJson(res, 200, { ok: true, ref, negotiationId: negId });
  } catch (e) {
    console.error("BOOKING_KV_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to save booking" });
  }
}
