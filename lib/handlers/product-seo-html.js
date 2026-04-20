import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { slugify, esc, jsonLdScript, publicStoreSlug } from "../seo-html.js";
import { CATEGORY_SLUGS, CITY_SLUGS, CITY_COPY } from "../seo-data.js";

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
    .trim()
    .slice(0, 120);

  if (!slug) {
    res.statusCode = 400;
    res.end("Bad Request");
    return;
  }

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("PRODUCT_SEO", e);
  }

  /** @type {{ item: string; price: string; listing: object; idx: number }[]} */
  const matches = [];
  for (const listing of listings) {
    const priceList = Array.isArray(listing.priceList) ? listing.priceList : [];
    priceList.forEach((row, idx) => {
      const item = String(row?.item || "").trim();
      if (!item) return;
      const ps = slugify(item);
      if (ps === slug) {
        matches.push({ item, price: String(row?.price || ""), listing, idx });
      }
    });
  }

  if (!matches.length) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><title>Product not found</title></head><body style="font-family:system-ui;padding:24px;background:#F5F0E8"><p>We couldn’t find that product right now.</p><p><a href="/stores">Browse stores</a></p></body></html>`
    );
    return;
  }

  const base = siteUrl();
  const primaryName = matches[0].item;
  const pageUrl = `${base}/products/${encodeURIComponent(slug)}`;

  const titlePlain = `${primaryName} UK — African, Caribbean & Asian Grocery | Clip Services`;
  const description = `Buy ${primaryName.toLowerCase()} online in the UK from trusted African, Caribbean and Asian independent stores on Clip Services. Compare sellers, secure Stripe checkout, collection or delivery where offered.`;

  const bodyIntro = `Looking for **${primaryName}** in the UK? Clip Services lists independents who stock diaspora groceries, beauty and cultural products. Below you’ll find stores currently listing this line — open a store to add items to your basket and pay securely. Many sellers send WhatsApp updates when your order is ready.`;

  const cards = matches
    .map((m) => {
      const sid = publicStoreSlug(m.listing);
      const storeName = m.listing.role || "Store";
      const storeUrl = `/stores/${encodeURIComponent(sid)}`;
      const pslug = slugify(m.item);
      const productUrl = `/store/${encodeURIComponent(m.listing.id)}/p/${m.idx}/${pslug}`;
      return `<article style="margin-bottom:16px;padding:16px;background:#fff;border-radius:12px;border:1px solid #E8DFD4">
<h2 style="font-size:1.05rem;margin:0 0 8px;color:#8B3A3A"><a href="${storeUrl}">${esc(storeName)}</a></h2>
<p style="margin:0 0 10px"><strong>${esc(m.price)}</strong></p>
<p style="margin:0 0 12px;font-size:14px;color:#5C4033">${esc((m.listing.bio || "").slice(0, 140))}${(m.listing.bio || "").length > 140 ? "…" : ""}</p>
<p style="margin:0"><a href="${storeUrl}" style="font-weight:700;color:#8B3A3A">Shop this store — add to basket</a> · <a href="${productUrl}">Product detail</a></p>
</article>`;
    })
    .join("");

  const catLinks = CATEGORY_SLUGS.slice(0, 4)
    .map((c) => `<a href="/categories/${c}">${esc(c.replace(/-/g, " "))}</a>`)
    .join(" · ");
  const cityLinks = CITY_SLUGS.slice(0, 4)
    .map((c) => `<a href="/cities/${c}">${esc(CITY_COPY[c]?.display || c)}</a>`)
    .join(" · ");

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: primaryName,
    description: description.slice(0, 500),
    url: pageUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "GBP",
      availability: "https://schema.org/InStock",
      offerCount: matches.length,
    },
    image: OG(),
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: titlePlain,
    numberOfItems: matches.length,
    itemListElement: matches.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/stores/${publicStoreSlug(m.listing)}`,
      name: `${primaryName} — ${m.listing.role || "Store"}`,
    })),
  };

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titlePlain)}</title>
<meta name="description" content="${esc(description.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(titlePlain)}">
<meta property="og:description" content="${esc(description.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(productLd)}
${jsonLdScript(itemList)}
</head>
<body style="font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Stores</a> · <a href="/blog">Blog</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A;font-size:clamp(1.25rem,4vw,1.7rem)">${esc(primaryName)} — buy online UK</h1>
<p>${esc(bodyIntro.replace(/\*\*/g, ""))}</p>
${cards}
<h2 style="font-size:1.05rem;margin-top:28px">Related browsing</h2>
<p>Categories: ${catLinks}</p>
<p>Cities: ${cityLinks}</p>
<p><a href="/community/african">African stores</a> · <a href="/community/caribbean">Caribbean</a> · <a href="/community/asian">Asian</a></p>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
