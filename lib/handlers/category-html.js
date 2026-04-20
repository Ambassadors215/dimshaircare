import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import {
  CATEGORY_COPY,
  CATEGORY_SLUG_ALIASES,
  CITY_SLUGS,
  CITY_COPY,
  listingMatchesCategory,
} from "../seo-data.js";
import { esc, jsonLdScript, publicStoreSlug } from "../seo-html.js";

const OG_IMAGE = () => `${siteUrl()}/icons/clip-logo-full.svg`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const raw = String(url.searchParams.get("slug") || "")
    .toLowerCase()
    .trim();

  if (CATEGORY_SLUG_ALIASES[raw]) {
    res.statusCode = 301;
    res.setHeader("Location", `/categories/${CATEGORY_SLUG_ALIASES[raw]}`);
    res.end();
    return;
  }

  const slug = raw;
  if (!CATEGORY_COPY[slug]) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>Category not found.</p><p><a href="/stores">Browse stores</a></p></body></html>`);
    return;
  }

  const copy = CATEGORY_COPY[slug];
  const base = siteUrl();
  const pageUrl = `${base}/categories/${slug}`;

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("CATEGORY_HTML_LISTINGS", e);
  }

  const matched = listings.filter((L) => listingMatchesCategory(L, copy.keywords));
  const listHtml = matched.length
    ? `<ul style="list-style:none;padding:0;margin:24px 0">
${matched
  .map((L) => {
    const sid = encodeURIComponent(publicStoreSlug(L));
    const n = esc(L.role || "Store");
    return `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8DFD4"><a href="/stores/${sid}" style="font-weight:700;color:#8B3A3A">${n}</a><br><span style="font-size:14px;color:#5C4033">${esc((L.bio || "").slice(0, 140))}…</span></li>`;
  })
  .join("\n")}
</ul>`
    : `<p><em>No stores matched this category yet — <a href="/stores">see all stores</a> or <a href="/store-owner">list your shop</a>.</em></p>`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: copy.h1, item: pageUrl },
    ],
  };

  const col = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: pageUrl,
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.h1,
    numberOfItems: matched.length,
    itemListElement: matched.slice(0, 40).map((L, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/stores/${publicStoreSlug(L)}`,
      name: L.role || "Store",
    })),
  };

  const cityLinks = CITY_SLUGS.slice(0, 5)
    .map((c) => `<a href="/cities/${c}">${esc(CITY_COPY[c]?.display || c)}</a>`)
    .join(" · ");

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(copy.title)}</title>
<meta name="description" content="${esc(copy.description)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(copy.title)}">
<meta property="og:description" content="${esc(copy.description)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG_IMAGE()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(breadcrumb)}
${jsonLdScript(col)}
</head>
<body style="font-family:system-ui,Segoe UI,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Browse stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">${esc(copy.h1)}</h1>
<p>${esc(copy.intro)}</p>
<h2 style="font-size:1.1rem;margin-top:28px">Stores with relevant products</h2>
${listHtml}
<h2 style="font-size:1.1rem;margin-top:32px">FAQ</h2>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>How do I know products are right for me?</summary><p>Stores set their own ranges and descriptions. Always check product labels and the seller’s information — especially for allergens, halal suitability, or dietary needs.</p></details>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>Do you deliver nationwide?</summary><p>Each store sets collection and delivery — Clip Services is the marketplace; fulfilment is between you and the seller.</p></details>
<p style="margin-top:28px"><strong>Browse by city</strong></p>
<p>${cityLinks}</p>
<p style="margin-top:24px"><a href="/blog">Food & shopping guides</a> · <a href="/store-owner" style="font-weight:700;color:#8B3A3A">List your store</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
