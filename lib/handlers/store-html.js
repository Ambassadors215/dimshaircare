import { getMarketplaceListingById } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { esc, jsonLdScript, slugify } from "../seo-html.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) {
    res.statusCode = 400;
    res.end("Bad Request");
    return;
  }

  const base = siteUrl();
  const ogImage = `${base}/icons/clip-logo-full.svg`;

  let listing;
  try {
    listing = await getMarketplaceListingById(id);
  } catch (e) {
    console.error("STORE_HTML", e);
    listing = null;
  }

  if (!listing) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>Store not found.</p><p><a href="/stores">Browse stores</a></p></body></html>`);
    return;
  }

  const name = listing.role || "Independent store";
  const bio = (listing.bio || "").slice(0, 300);
  const pageUrl = `${base}/store/${encodeURIComponent(id)}`;
  const title = `${esc(name)} | Clip Services`;
  const desc = bio || `${name} — African, Caribbean & Asian independent store on Clip Services UK.`;

  const priceList = Array.isArray(listing.priceList) ? listing.priceList : [];
  const graph = [
    {
      "@type": "LocalBusiness",
      "@id": `${pageUrl}#business`,
      name,
      description: bio || undefined,
      url: pageUrl,
      image: ogImage,
      address: {
        "@type": "PostalAddress",
        addressCountry: "GB",
      },
    },
    ...priceList.slice(0, 24).map((row, i) => {
      const itemName = String(row?.item || `Item ${i + 1}`).slice(0, 140);
      const pslug = slugify(itemName);
      const productUrl = `${pageUrl}/p/${i}/${pslug}`;
      const priceNum = String(row?.price || "")
        .replace(/[^0-9.]/g, "")
        .slice(0, 12);
      return {
        "@type": "Product",
        name: itemName,
        url: productUrl,
        offers: {
          "@type": "Offer",
          priceCurrency: "GBP",
          price: priceNum || "0",
          availability: "https://schema.org/InStock",
          url: productUrl,
        },
      };
    }),
  ];

  const structured = { "@context": "https://schema.org", "@graph": graph };

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Clip Services">
<meta property="og:title" content="${esc(name)} — Clip Services">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="${esc(name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(name)} — Clip Services">
<meta name="twitter:description" content="${esc(desc.slice(0, 200))}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(structured)}
</head>
<body style="font-family:system-ui,Segoe UI,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.6">
<p><a href="/">← Clip Services home</a> · <a href="/stores">All stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">${esc(name)}</h1>
<p>${esc(bio || "Independent seller on the UK marketplace for African, Caribbean and Asian stores.")}</p>
${priceList.length ? `<h2 style="font-size:1.1rem;margin-top:28px">Sample products &amp; prices</h2><ul>${priceList
  .map((r, i) => {
    const pslug = slugify(r.item);
    const pu = `/store/${encodeURIComponent(id)}/p/${i}/${pslug}`;
    return `<li><a href="${pu}"><strong>${esc(r.item)}</strong></a> — ${esc(r.price)}</li>`;
  })
  .join("")}</ul>` : "<p><em>Product list coming soon — contact the store via your order flow.</em></p>"}
<p style="margin-top:32px"><a href="/stores" style="color:#8B3A3A;font-weight:700">Browse more stores</a> · <a href="/store-owner" style="color:#8B3A3A;font-weight:700">List your store</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
