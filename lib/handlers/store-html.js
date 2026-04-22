import {
  getMarketplaceListingById,
  getMarketplaceListingByPublicSlug,
  getMarketplaceListings,
  isListingPubliclyVisible,
} from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { getComboPageHtml } from "./combo-html.js";
import { buildStorePageHtml } from "../store-page-html.js";
import { inferPrimaryCommunity, CITY_SLUGS, CITY_COPY } from "../seo-data.js";

function citySlugFromDisplay(display) {
  const n = String(display || "").toLowerCase().trim();
  if (!n) return null;
  for (const s of CITY_SLUGS) {
    if (CITY_COPY[s]?.display.toLowerCase() === n) return s;
  }
  return null;
}

function pickSimilarStores(listing, all) {
  const id = String(listing.id);
  const city = String(listing.city || "").toLowerCase().trim();
  const pc = inferPrimaryCommunity(listing);
  const myTags = new Set(
    [...(Array.isArray(listing.services) ? listing.services : []), listing.category].filter(Boolean)
  );
  const candidates = all.filter((x) => isListingPubliclyVisible(x) && String(x.id) !== id);
  const scored = candidates.map((x) => {
    let s = 0;
    if (city && String(x.city || "").toLowerCase().trim() === city) s += 5;
    if (inferPrimaryCommunity(x) === pc) s += 3;
    const xt = new Set([...(Array.isArray(x.services) ? x.services : []), x.category].filter(Boolean));
    for (const t of myTags) {
      if (xt.has(t)) s += 2;
    }
    return { x, s };
  });
  scored.sort((a, b) => b.s - a.s);
  const out = [];
  for (const { x, s } of scored) {
    if (s > 0 && out.length < 3) out.push(x);
  }
  if (out.length < 3) {
    for (const x of candidates) {
      if (out.some((o) => String(o.id) === String(x.id))) continue;
      if (city && String(x.city || "").toLowerCase().trim() === city) out.push(x);
      if (out.length >= 3) break;
    }
  }
  if (out.length < 3) {
    for (const x of candidates) {
      if (out.some((o) => String(o.id) === String(x.id))) continue;
      out.push(x);
      if (out.length >= 3) break;
    }
  }
  return out.slice(0, 3);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const idParam = String(url.searchParams.get("id") || "").trim();
  const slugParam = String(url.searchParams.get("slug") || "").trim();

  let listing = null;
  try {
    if (slugParam) {
      listing = await getMarketplaceListingByPublicSlug(slugParam);
    } else if (idParam) {
      listing = await getMarketplaceListingById(idParam);
    }
  } catch (e) {
    console.error("STORE_HTML", e);
    listing = null;
  }

  if (!listing && slugParam) {
    try {
      const comboHtml = await getComboPageHtml(slugParam);
      if (comboHtml) {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
        res.end(comboHtml);
        return;
      }
    } catch (e) {
      console.error("STORE_HTML_COMBO", e);
    }
  }

  if (!listing) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Store not found</title></head><body style="font-family:system-ui,sans-serif;padding:24px;background:#F5F0E8;color:#2C1810"><p>Store not found.</p><p><a href="/stores">Browse stores</a></p></body></html>`
    );
    return;
  }

  if (listing.applicationStatus === "pending") {
    const name = String(listing.role || "Application").replace(/</g, "&lt;");
    const ref = String(listing.applicationRef || listing.id || "");
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("cache-control", "private, no-store");
    res.end(`<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Under review — ${name}</title><meta name="robots" content="noindex,nofollow"></head><body style="font-family:Inter,system-ui,sans-serif;padding:32px 20px;background:#F5F0E8;color:#2C1810;max-width:560px;margin:0 auto;line-height:1.6"><h1 style="color:#8B3A3A;font-family:Georgia,serif">${name}</h1><p>This store profile is <strong>under review</strong>. It is not visible in the public directory yet.</p><p>Reference: <strong>${ref}</strong></p><p>Questions? <a href="https://wa.me/447487588706">WhatsApp Clip Services</a> · <a href="/stores">Browse live stores</a></p></body></html>`);
    return;
  }

  const base = siteUrl();
  const city = typeof listing.city === "string" ? listing.city.trim() : "";
  const citySlug = citySlugFromDisplay(city) || "";

  let similarStores = [];
  try {
    const all = await getMarketplaceListings();
    similarStores = pickSimilarStores(listing, all);
  } catch (e) {
    console.error("STORE_HTML_SIMILAR", e);
  }

  const html = buildStorePageHtml(listing, { similarStores, base, citySlug });

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
