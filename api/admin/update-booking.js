import { endJson, readBody, requireAdmin } from "./_utils.js";
import { updateBookingStatus } from "../../lib/kv-store.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const ref = String(payload?.ref || "").trim();
  const status = String(payload?.status || "").trim();
  const allowed = new Set(["new", "confirmed", "completed", "cancelled"]);
  if (!ref) return endJson(res, 400, { ok: false, error: "Missing ref" });
  if (!allowed.has(status)) return endJson(res, 400, { ok: false, error: "Invalid status" });

  try {
    const updated = await updateBookingStatus(ref, status);
    if (!updated) return endJson(res, 404, { ok: false, error: "Booking not found" });
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("ADMIN_UPDATE_BOOKING_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to update" });
  }
}
