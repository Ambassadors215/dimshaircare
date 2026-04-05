import { getMarketplaceListings } from "../lib/kv-store.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=60");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  try {
    const rows = await getMarketplaceListings();
    const items = rows.map(({ email: _e, ...pub }) => ({
      id: pub.id,
      role: pub.role,
      bio: pub.bio,
      services: pub.services,
      category: pub.category,
      icon: pub.icon,
      popular: pub.popular,
      negotiationEnabled: pub.negotiationEnabled !== false,
      priceList: Array.isArray(pub.priceList) ? pub.priceList.slice(0, 20) : [],
      pricingNote: typeof pub.pricingNote === "string" ? pub.pricingNote.slice(0, 2000) : "",
    }));
    return endJson(res, 200, { ok: true, items });
  } catch (e) {
    console.error("LISTINGS_ERROR", e);
    return endJson(res, 200, { ok: true, items: [] });
  }
}
