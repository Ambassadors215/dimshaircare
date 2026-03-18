import { endJson, requireAdmin } from "./_utils.js";
import { getBookings } from "../../lib/kv-store.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  try {
    const items = await getBookings();
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("ADMIN_BOOKINGS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load bookings" });
  }
}
