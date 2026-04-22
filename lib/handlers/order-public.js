import { getBookingByRef, getMarketplaceListingById } from "../kv-store.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

/** Public read of a paid booking by ref (unguessable ref acts as capability). */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const ref = String(url.searchParams.get("ref") || "")
    .trim()
    .slice(0, 32);

  if (!ref || !/^CS-[A-Z0-9]+$/i.test(ref)) {
    return endJson(res, 400, { ok: false, error: "Invalid reference" });
  }

  try {
    const booking = await getBookingByRef(ref);
    if (!booking || String(booking.status) !== "paid") {
      return endJson(res, 404, { ok: false, error: "Order not found" });
    }

    const cartSnapshot = Array.isArray(booking.cartSnapshot) ? booking.cartSnapshot : [];
    return endJson(res, 200, {
      ok: true,
      order: {
        ref: String(booking.ref),
        firstName: String(booking.firstName || ""),
        lastName: String(booking.lastName || ""),
        email: String(booking.email || "").replace(/(.{2}).*(@.*)/, "$1***$2"),
        phone: String(booking.phone || "").replace(/(\d{3})\d+(\d{2})/, "$1***$2"),
        service: String(booking.service || ""),
        subtotalGBP: booking.subtotalGBP,
        deliveryFeeGBP: booking.deliveryFeeGBP,
        platformFeeGBP: booking.platformFeeGBP,
        totalGBP: booking.totalGBP,
        fulfillment: String(booking.fulfillment || "collection"),
        deliveryAddress: booking.deliveryAddress && typeof booking.deliveryAddress === "object" ? booking.deliveryAddress : null,
        cartSnapshot: cartSnapshot.map((l) => ({
          item: String(l?.item || ""),
          qty: Number(l?.qty) || 0,
          price: String(l?.price || ""),
        })),
        paidAt: String(booking.paidAt || ""),
        listingId: String(booking.listingId || booking.providerId || ""),
        storeWhatsApp,
      },
    });
  } catch (e) {
    console.error("ORDER_PUBLIC", e);
    return endJson(res, 500, { ok: false, error: "Server error" });
  }
}
