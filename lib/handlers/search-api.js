import { getMarketplaceListings, isListingPubliclyVisible, recordSearchQuery } from "../kv-store.js";
import {
  runSearch,
  sortProducts,
  UK_CITY_DISPLAY,
  normalizeQuery,
  activeCitiesFromListings,
} from "../search-core.js";
import { getSearchLandingPage } from "../seo-data.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=30, s-maxage=60");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  const url = new URL(req.url || "/", "http://localhost");
  let q = String(url.searchParams.get("q") || "").trim();
  const slugParam = String(url.searchParams.get("slug") || "")
    .trim()
    .toLowerCase();
  const landing = slugParam ? getSearchLandingPage(slugParam) : null;
  if (landing) {
    q = landing.q;
  } else if (slugParam && !q) {
    q = slugParam.replace(/-/g, " ");
  }

  const filters = {
    community: String(url.searchParams.get("community") || landing?.community || "").trim(),
    city: String(url.searchParams.get("city") || landing?.city || "").trim(),
    categories: String(url.searchParams.get("categories") || "").trim(),
    fulfilment: String(url.searchParams.get("fulfilment") || "both").trim(),
    priceMin: url.searchParams.get("priceMin"),
    priceMax: url.searchParams.get("priceMax"),
    ratingMin: url.searchParams.get("ratingMin"),
    openNow: url.searchParams.get("openNow"),
    inStockOnly: url.searchParams.get("inStockOnly"),
  };
  if (landing?.city && !url.searchParams.get("city")) filters.city = landing.city;
  if (landing?.community && !url.searchParams.get("community")) filters.community = landing.community;

  const sort = String(url.searchParams.get("sort") || "relevant").trim();

  try {
    const listings = (await getMarketplaceListings()).filter(isListingPubliclyVisible);
    const out = runSearch(listings, q, filters);
    let products = sortProducts(out.products, sort);

    const total = products.length + out.stores.length;
    const nq = normalizeQuery(q);
    if (nq.length >= 2) {
      void recordSearchQuery(nq, total).catch((e) => console.error("SEARCH_LOG", e));
    }

    products = products.slice(0, 200);
    const active = activeCitiesFromListings(listings);
    const citySet = new Set([...UK_CITY_DISPLAY, ...active]);
    const citiesMerged = Array.from(citySet).sort((a, b) => a.localeCompare(b, "en-GB"));

    return endJson(res, 200, {
      ok: true,
      q,
      landing: landing ? { slug: landing.slug, q: landing.q, city: landing.city || "", community: landing.community || "" } : null,
      cities: citiesMerged,
      activeCities: active,
      products,
      stores: out.stores.slice(0, 60),
      categories: out.categories,
      facetCategories: out.facetCategories || [],
      intents: out.intents,
    });
  } catch (e) {
    console.error("SEARCH_API", e);
    return endJson(res, 500, { ok: false, error: "Search failed" });
  }
}
