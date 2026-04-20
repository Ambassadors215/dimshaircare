import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { CITY_COPY, CITY_SLUGS, listingMatchesCity } from "../seo-data.js";
import { esc, jsonLdScript } from "../seo-html.js";

const OG_IMAGE = () => `${siteUrl()}/icons/clip-logo-full.svg`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const slug = String(url.searchParams.get("city") || "")
    .toLowerCase()
    .trim();

  if (!CITY_SLUGS.includes(slug) || !CITY_COPY[slug]) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>City page not found.</p><p><a href="/">Home</a></p></body></html>`);
    return;
  }

  const copy = CITY_COPY[slug];
  const base = siteUrl();
  const pageUrl = `${base}/cities/${slug}`;

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("CITY_HTML_LISTINGS", e);
  }

  const matched = listings.filter((L) => listingMatchesCity(L, copy.display));
  const listHtml = matched.length
    ? `<ul style="list-style:none;padding:0;margin:24px 0">
${matched
  .map((L) => {
    const id = encodeURIComponent(L.id);
    const n = esc(L.role || "Store");
    return `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8DFD4"><a href="/store/${id}" style="font-weight:700;color:#8B3A3A">${n}</a><br><span style="font-size:14px;color:#5C4033">${esc((L.bio || "").slice(0, 160))}${(L.bio || "").length > 160 ? "…" : ""}</span></li>`;
  })
  .join("\n")}
</ul>`
    : `<p><em>No stores are tagged for ${esc(copy.display)} yet — <a href="/stores">browse all stores</a> or <a href="/store-owner">list yours</a>.</em></p>`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: copy.display, item: pageUrl },
    ],
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
<meta property="og:image" content="${OG_IMAGE()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(breadcrumb)}
${jsonLdScript(webPage)}
</head>
<body style="font-family:system-ui,Segoe UI,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Browse stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">African, Caribbean &amp; Asian stores in ${esc(copy.display)}</h1>
<p>${esc(copy.intro)}</p>
<h2 style="font-size:1.15rem;margin-top:32px">Stores</h2>
${listHtml}
<h2 style="font-size:1.15rem;margin-top:36px">FAQ — ${esc(copy.display)}</h2>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>Can I get delivery in ${esc(copy.display)}?</summary><p>Delivery depends on each independent store. Check the store profile or ask when you order — many offer collection or local delivery.</p></details>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>How do I pay?</summary><p>Secure card checkout with Stripe on Clip Services. You may also get WhatsApp updates from the seller.</p></details>
<details style="margin-bottom:10px;background:#fff;padding:14px;border-radius:10px;border:1px solid #E8DFD4"><summary>How do I list my shop?</summary><p><a href="/store-owner">Apply free</a> — we review African, Caribbean and Asian independents across the UK.</p></details>
<p style="margin-top:28px"><a href="/store-owner" style="font-weight:700;color:#8B3A3A">List your store</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
