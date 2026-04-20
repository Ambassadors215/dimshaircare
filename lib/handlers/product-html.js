import { getMarketplaceListingById } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { esc, jsonLdScript, slugify, publicStoreSlug } from "../seo-html.js";

const OG_IMAGE = () => `${siteUrl()}/icons/clip-logo-full.svg`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const storeId = String(url.searchParams.get("storeId") || "").trim();
  const idx = parseInt(url.searchParams.get("idx") || "", 10);

  if (!storeId || Number.isNaN(idx) || idx < 0) {
    res.statusCode = 400;
    res.end("Bad Request");
    return;
  }

  let listing;
  try {
    listing = await getMarketplaceListingById(storeId);
  } catch (e) {
    listing = null;
  }

  const priceList = listing && Array.isArray(listing.priceList) ? listing.priceList : [];
  const row = priceList[idx];
  if (!listing || !row || !String(row.item || "").trim()) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      `<!DOCTYPE html><html><head><title>Not found</title></head><body><p>Product not found.</p><p><a href="/stores">Browse stores</a></p></body></html>`
    );
    return;
  }

  const base = siteUrl();
  const storeName = listing.role || "Store";
  const storePath = `/stores/${encodeURIComponent(publicStoreSlug(listing))}`;
  const itemName = String(row.item).trim();
  const priceStr = String(row.price || "").trim();
  const slug = slugify(itemName);
  const pageUrl = `${base}/store/${encodeURIComponent(storeId)}/p/${idx}/${slug}`;

  const title = `${esc(itemName)} — ${esc(storeName)} | Clip Services`;
  const desc = `Buy ${itemName} from ${storeName} on Clip Services — UK marketplace for African, Caribbean & Asian independents. ${priceStr ? `From ${priceStr}.` : ""}`;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: itemName,
    description: `${itemName} from ${storeName} on Clip Services`,
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      priceCurrency: "GBP",
      price: priceStr.replace(/[^0-9.]/g, "") || "0",
      availability: "https://schema.org/InStock",
      url: pageUrl,
      seller: { "@type": "Organization", name: storeName },
    },
    image: OG_IMAGE(),
  };

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${esc(desc.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(itemName)} — ${esc(storeName)}">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG_IMAGE()}">
<meta property="product:price:amount" content="${esc(priceStr.replace(/[^0-9.]/g, "") || "0")}">
<meta property="product:price:currency" content="GBP">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(productLd)}
</head>
<body style="font-family:system-ui,Segoe UI,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.6">
<p><a href="${storePath}">← ${esc(storeName)}</a> · <a href="/stores">All stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">${esc(itemName)}</h1>
<p><strong>${esc(storeName)}</strong></p>
<p>Price: <strong>${esc(priceStr || "See store")}</strong></p>
<p><a href="${storePath}" style="font-weight:700;color:#8B3A3A">View full store</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
