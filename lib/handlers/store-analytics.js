import { incrementStoreAnalytics, getMarketplaceListingById } from "../kv-store.js";

function readBody(req, limitBytes = 8192) {
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

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.setHeader("access-control-allow-origin", "*");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-max-age", "86400");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw || "{}");
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const listingId = String(payload?.listingId || "")
    .trim()
    .slice(0, 64);
  const event = String(payload?.event || "").trim();
  const productIdx = payload?.productIdx;

  if (!listingId || !event) {
    return endJson(res, 400, { ok: false, error: "listingId and event required" });
  }

  try {
    const listing = await getMarketplaceListingById(listingId);
    if (!listing) {
      return endJson(res, 404, { ok: false, error: "Store not found" });
    }
    await incrementStoreAnalytics(listingId, event, productIdx);
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("STORE_ANALYTICS", e);
    return endJson(res, 503, { ok: false, error: "Unavailable" });
  }
}
