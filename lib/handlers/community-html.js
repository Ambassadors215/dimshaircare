import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import {
  COMMUNITY_SLUGS,
  COMMUNITY_COPY,
  CITY_SLUGS,
  CITY_COPY,
  CATEGORY_SLUGS,
  listingMatchesCommunity,
} from "../seo-data.js";
import { esc, jsonLdScript, publicStoreSlug } from "../seo-html.js";

const OG = () => `${siteUrl()}/icons/clip-logo-full.svg`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const slug = String(url.searchParams.get("slug") || "")
    .toLowerCase()
    .trim();

  if (!COMMUNITY_SLUGS.includes(slug) || !COMMUNITY_COPY[slug]) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>Page not found.</p><p><a href="/">Home</a></p></body></html>`);
    return;
  }

  const copy = COMMUNITY_COPY[slug];
  const base = siteUrl();
  const pageUrl = `${base}/community/${slug}`;

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("COMMUNITY_HTML", e);
  }

  const matched = listings.filter((L) => listingMatchesCommunity(L, slug));

  const listHtml = matched.length
    ? `<ul style="list-style:none;padding:0;margin:24px 0">
${matched
  .map((L) => {
    const sid = encodeURIComponent(publicStoreSlug(L));
    const n = esc(L.role || "Store");
    return `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8DFD4"><a href="/stores/${sid}" style="font-weight:700;color:#8B3A3A">${n}</a><br><span style="font-size:14px;color:#5C4033">${esc((L.bio || "").slice(0, 160))}${(L.bio || "").length > 160 ? "…" : ""}</span></li>`;
  })
  .join("\n")}
</ul>`
    : `<p><em>No stores matched yet — <a href="/stores">see all stores</a> or <a href="/store-owner">open yours</a>.</em></p>`;

  const cityLinks = CITY_SLUGS.slice(0, 6)
    .map((c) => `<a href="/cities/${c}">${esc(CITY_COPY[c]?.display || c)}</a>`)
    .join(" · ");
  const catLinks = CATEGORY_SLUGS.slice(0, 5)
    .map((c) => `<a href="/categories/${c}">${esc(c.replace(/-/g, " "))}</a>`)
    .join(" · ");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.title,
    numberOfItems: matched.length,
    itemListElement: matched.slice(0, 30).map((L, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/stores/${publicStoreSlug(L)}`,
      name: L.role || "Store",
    })),
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: copy.title,
    description: copy.description,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "Clip Services", url: base },
  };

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
<meta property="og:image" content="${OG()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(webPage)}
${jsonLdScript(itemList)}
</head>
<body style="font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Stores</a> · <a href="/blog">Blog</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">${esc(copy.h1)}</h1>
<p>${esc(copy.intro)}</p>
<h2 style="font-size:1.15rem;margin-top:28px">Stores on Clip Services</h2>
${listHtml}
<h2 style="font-size:1.1rem;margin-top:32px">Shop by city</h2>
<p>${cityLinks}</p>
<h2 style="font-size:1.1rem;margin-top:24px">Shop by category</h2>
<p>${catLinks}</p>
<p style="margin-top:28px"><a href="/store-owner" style="font-weight:700;color:#8B3A3A">List your store</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
