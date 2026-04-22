/**
 * Product & store search: synonyms, intent hints, scoring (in-memory over listings).
 */
import { inferPrimaryCommunity, listingMatchesCommunity, CATEGORY_COPY } from "./seo-data.js";
import { publicStoreSlug, slugify } from "./seo-html.js";

export const UK_CITY_DISPLAY = [
  "Manchester",
  "London",
  "Birmingham",
  "Leeds",
  "Leicester",
  "Bradford",
  "Bristol",
  "Liverpool",
  "Sheffield",
  "Nottingham",
];

/** Extra phrases to OR-match when user types the key term */
export const SYNONYMS = {
  yam: ["white yam", "pounded yam", "yam flour", "water yam"],
  meat: ["halal meat", "butcher", "goat meat", "lamb", "chicken"],
  rice: ["basmati", "jollof", "jasmine rice", "long grain"],
  plantain: ["green plantain", "ripe plantain", "plantain chips", "fried plantain"],
  fufu: ["fufu flour", "cassava fufu", "cocoyam fufu", "pounded yam"],
  halal: ["halal butcher", "halal certified", "halal chicken"],
  jollof: ["jollof rice", "rice mix", "tomato stew"],
  jerk: ["jerk seasoning", "jerk marinade", "caribbean seasoning"],
};

export function normalizeQuery(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 120);
}

/** Expand query text with synonym phrases for scoring */
export function expandedSearchText(query) {
  const n = normalizeQuery(query);
  const parts = new Set([n]);
  for (const [key, phrases] of Object.entries(SYNONYMS)) {
    if (n.includes(key)) {
      phrases.forEach((p) => parts.add(p));
    }
  }
  return Array.from(parts).join(" ");
}

export function parseIntent(query) {
  const n = normalizeQuery(query);
  const intents = {
    halalBoost: /\bhalal\b/.test(n),
    deliveryOnly: /\bdelivery\b/.test(n) || /\bdeliver\b/.test(n),
    nearMe: /\bnear me\b/.test(n) || /\bnearby\b/.test(n),
    city: null,
    stripped: n,
  };
  for (const city of UK_CITY_DISPLAY) {
    const low = city.toLowerCase();
    if (n.includes(low)) {
      intents.city = city;
      intents.stripped = n.replace(new RegExp(low, "gi"), " ").replace(/\s+/g, " ").trim();
      break;
    }
  }
  return intents;
}

/** Cities that have at least one visible listing (for search / discovery filters). */
export function activeCitiesFromListings(listings) {
  const set = new Set();
  for (const L of listings) {
    const c = typeof L.city === "string" ? L.city.trim() : "";
    if (c) set.add(c);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "en-GB"));
}

function facetLabel(slug) {
  const s = String(slug || "groceries")
    .toLowerCase()
    .replace(/-/g, " ");
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function averageRating(listing) {
  const rev = Array.isArray(listing?.reviews) ? listing.reviews : [];
  if (!rev.length) return 0;
  let s = 0;
  for (const r of rev) {
    s += Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
  }
  return Math.round((s / rev.length) * 10) / 10;
}

function scoreTextMatch(hay, needle) {
  const h = hay.toLowerCase();
  const n = needle.toLowerCase();
  if (!n.trim()) return 0.5;
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(n)) return 60;
  const words = n.split(/\s+/).filter(Boolean);
  let sc = 0;
  for (const w of words) {
    if (w.length < 2) continue;
    if (h.includes(w)) sc += 20;
  }
  return Math.min(55, sc);
}

function listingBlob(listing) {
  return [
    listing.role,
    listing.bio,
    listing.city,
    listing.category,
    ...(Array.isArray(listing.services) ? listing.services : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function productBlob(name, desc) {
  return [name, desc].filter(Boolean).join(" ");
}

/**
 * @param {object[]} listings - marketplace listings (visible)
 * @param {string} query
 * @param {object} filters
 */
export function runSearch(listings, query, filters = {}) {
  const rawQ = normalizeQuery(query);
  const intent = parseIntent(query);
  const expanded = expandedSearchText(intent.stripped || rawQ);
  const searchLine = expanded || rawQ;

  let community = filters.community || "";
  const cityFilter = (filters.city || intent.city || "").trim();
  const priceMin = Number(filters.priceMin);
  const priceMax = Number(filters.priceMax);
  const ratingMin = Number(filters.ratingMin);
  const openNow = filters.openNow === true || filters.openNow === "true";
  const inStockOnly = filters.inStockOnly === true || filters.inStockOnly === "true";
  let fulfil = filters.fulfilment || "both"; // collection | delivery | both

  if (intent.deliveryOnly) fulfil = "delivery";

  const stores = [];
  const catSlugs =
    typeof filters.categories === "string"
      ? filters.categories
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      : Array.isArray(filters.categories)
        ? filters.categories.map((s) => String(s).toLowerCase())
        : [];
  const requireQuery = rawQ.length >= 2;
  const productsAll = [];

  for (const listing of listings) {
    const listingId = String(listing.id || "");
    if (!listingId) continue;

    const city = typeof listing.city === "string" ? listing.city.trim() : "";
    const slug = publicStoreSlug(listing);
    const storeUrl = `/stores/${encodeURIComponent(slug)}`;
    const rating = averageRating(listing);
    const comm = inferPrimaryCommunity(listing);
    const blob = listingBlob(listing);

    if (community && community !== "all") {
      if (!listingMatchesCommunity(listing, community)) continue;
    }

    if (cityFilter && city && city.toLowerCase() !== cityFilter.toLowerCase()) continue;

    if (intent.halalBoost && fulfil !== "delivery") {
      /* boost halal-related listings when query mentions halal */
    }

    if (fulfil === "delivery" && listing.deliveryEnabled === false) continue;
    if (fulfil === "collection" && listing.collectionEnabled === false) continue;

    if (openNow && listing.storeOpen === false) continue;

    const storeScore = scoreTextMatch(blob, searchLine) + (intent.halalBoost && /\bhalal\b/i.test(blob) ? 25 : 0);
    if (rawQ.length >= 2 && storeScore < 8 && !blob.toLowerCase().includes(rawQ.split(/\s+/)[0])) {
      /* might still add products below */
    }

    const priceList = Array.isArray(listing.priceList) ? listing.priceList : [];
    const storeProducts = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];

    for (let idx = 0; idx < priceList.length; idx++) {
      const row = priceList[idx];
      const sp = storeProducts[idx] || {};
      const name = String(row?.item || sp?.name || "").trim();
      if (!name) continue;
      const priceStr = String(row?.price || "").trim();
      const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
      const desc = String(sp.description || "").slice(0, 200);
      const inStock = sp.inStock !== false;
      const cat = String(sp.category || "groceries").toLowerCase().replace(/\s+/g, "-");

      if (inStockOnly && !inStock) continue;
      if (Number.isFinite(priceMin) && priceMin > 0 && priceNum < priceMin) continue;
      if (Number.isFinite(priceMax) && priceMax > 0 && priceNum > priceMax) continue;

      const pb = productBlob(name, desc);
      let pScore = scoreTextMatch(pb, searchLine);
      if (intent.halalBoost && /\bhalal\b/i.test(pb)) pScore += 20;
      if (rawQ.length >= 2 && pScore < 5 && !pb.toLowerCase().includes(rawQ.split(/\s+/)[0])) {
        continue;
      }

      if (ratingMin >= 3 && rating < ratingMin - 0.1) continue;
      if (ratingMin >= 4 && rating < 4 - 0.1) continue;
      if (ratingMin >= 5 && rating < 4.9) continue;

      const photoData =
        typeof sp.photoData === "string" && sp.photoData.startsWith("data:") ? sp.photoData : "";

      productsAll.push({
        listingId,
        productIdx: idx,
        name,
        priceStr,
        priceNum,
        categorySlug: cat,
        storeName: listing.role || "Store",
        city,
        storeSlug: slug,
        rating,
        photoData,
        inStock,
        fulfilment: {
          collection: listing.collectionEnabled !== false,
          delivery: listing.deliveryEnabled !== false,
        },
        storeOpen: listing.storeOpen !== false,
        storeUrl,
        productUrl: `/store/${encodeURIComponent(listingId)}/p/${idx}/${slugify(name)}`,
        score: pScore + rating * 2 + (intent.nearMe ? (city ? 3 : 0) : 0),
        community: comm,
      });
    }

    const stScore = storeScore + rating * 3;
    if (
      requireQuery &&
      (stScore >= 18 || blob.toLowerCase().includes(rawQ.split(/\s+/)[0]) || listing.role?.toLowerCase().includes(rawQ))
    ) {
      stores.push({
        id: listingId,
        name: listing.role || "Store",
        city,
        slug,
        rating,
        storeUrl,
        score: stScore,
        storeOpen: listing.storeOpen !== false,
        deliveryEnabled: listing.deliveryEnabled !== false,
        collectionEnabled: listing.collectionEnabled !== false,
        snippet: (listing.bio || "").slice(0, 160),
        community: comm,
      });
    }
  }

  /* Deduplicate stores by id */
  const seen = new Set();
  const uniqStores = [];
  for (const s of stores.sort((a, b) => b.score - a.score)) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    uniqStores.push(s);
  }

  const facetMap = {};
  for (const p of productsAll) {
    const slug = p.categorySlug || "groceries";
    facetMap[slug] = (facetMap[slug] || 0) + 1;
  }
  const facetCategories = Object.entries(facetMap)
    .map(([slug, count]) => ({ slug, count, label: facetLabel(slug) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  let products = productsAll;
  if (catSlugs.length) {
    products = productsAll.filter((p) =>
      catSlugs.some((c) => p.categorySlug === c || (p.categorySlug || "").includes(c))
    );
  }

  products.sort((a, b) => b.score - a.score);

  /* Category suggestions */
  const catHits = [];
  if (rawQ.length >= 1) {
    for (const [slug, copy] of Object.entries(CATEGORY_COPY)) {
      const text = `${copy.h1} ${copy.intro} ${(copy.keywords || []).join(" ")}`;
      const sc = scoreTextMatch(text, searchLine);
      if (sc >= 15 || (copy.keywords || []).some((k) => searchLine.includes(k))) {
        catHits.push({
          slug,
          label: copy.h1.replace(/<[^>]+>/g, "").slice(0, 80),
          url: `/categories/${slug}`,
          score: sc,
        });
      }
    }
    catHits.sort((a, b) => b.score - a.score);
  }

  return {
    products,
    stores: uniqStores.slice(0, 40),
    categories: catHits.slice(0, 12),
    facetCategories,
    intents: intent,
    normalizedQuery: rawQ,
  };
}

export function sortProducts(products, sortKey) {
  const arr = [...products];
  switch (sortKey) {
    case "price_asc":
      return arr.sort((a, b) => a.priceNum - b.priceNum);
    case "price_desc":
      return arr.sort((a, b) => b.priceNum - a.priceNum);
    case "rated":
      return arr.sort((a, b) => b.rating - a.rating);
    case "nearest":
      return arr.sort((a, b) => (a.city || "").localeCompare(b.city || "", "en-GB"));
    case "delivery":
      return arr.sort((a, b) => Number(b.fulfilment?.delivery) - Number(a.fulfilment?.delivery));
    case "relevant":
    default:
      return arr.sort((a, b) => b.score - a.score);
  }
}
