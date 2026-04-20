import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import {
  getComboPage,
  CITY_COPY,
  COMMUNITY_COPY,
  CITY_SLUGS,
  CATEGORY_SLUGS,
  listingMatchesCity,
  listingMatchesCommunity,
  CITY_NEARBY,
} from "../seo-data.js";
import { esc, jsonLdScript, publicStoreSlug } from "../seo-html.js";

const OG = () => `${siteUrl()}/icons/clip-logo-full.svg`;

/**
 * Renders /stores/[combo-slug] landing (e.g. nigerian-london) when slug is not a store profile.
 * Returns null if slug is not a known combination.
 */
export async function getComboPageHtml(slugParam) {
  const combo = getComboPage(slugParam);
  if (!combo) return null;

  const city = CITY_COPY[combo.citySlug];
  const comm = COMMUNITY_COPY[combo.community];
  if (!city || !comm) return null;

  const base = siteUrl();
  const pageUrl = `${base}/stores/${encodeURIComponent(combo.slug)}`;

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("COMBO_HTML", e);
  }

  const matched = listings.filter(
    (L) => listingMatchesCommunity(L, combo.community) && listingMatchesCity(L, city.display)
  );

  const title = `${city.display} — ${comm.h1} | Clip Services`;
  const description = `Shop ${comm.keywords.slice(0, 4).join(", ")} from independents in ${city.display}. Order online on Clip Services — secure Stripe checkout.`;

  const intro2 = `${city.display} is home to a vibrant African, Caribbean and Asian community. Independent grocers, market traders and beauty suppliers offer authentic ingredients, halal meat, spices, hair and beauty products, and cultural essentials. Clip Services lists verified stores so you can browse online, pay securely with Stripe, and choose collection or delivery where the seller offers it — with WhatsApp updates on many orders.`;

  const listHtml = matched.length
    ? `<ul style="list-style:none;padding:0;margin:24px 0">
${matched
  .map((L) => {
    const sid = encodeURIComponent(publicStoreSlug(L));
    const n = esc(L.role || "Store");
    return `<li style="margin-bottom:14px;padding:14px;background:#fff;border-radius:12px;border:1px solid #E8DFD4"><a href="/stores/${sid}" style="font-weight:700;color:#8B3A3A">${n}</a><br><span style="font-size:14px;color:#5C4033">${esc((L.bio || "").slice(0, 180))}${(L.bio || "").length > 180 ? "…" : ""}</span></li>`;
  })
  .join("\n")}
</ul>`
    : `<p><em>No stores matched this filter yet — <a href="/stores">browse all UK stores</a> or <a href="/store-owner">list yours</a>.</em></p>`;

  const nearby = (CITY_NEARBY[combo.citySlug] || [])
    .filter((s) => CITY_SLUGS.includes(s))
    .slice(0, 3);
  const nearbyLinks = nearby
    .map((s) => `<a href="/cities/${s}">${esc(CITY_COPY[s].display)}</a>`)
    .join(" · ");

  const catLinks = CATEGORY_SLUGS.slice(0, 4)
    .map((s) => `<a href="/categories/${s}">${esc(s.replace(/-/g, " "))}</a>`)
    .join(" · ");

  const related = `
<p style="margin-top:28px"><strong>Explore more</strong></p>
<p>${nearbyLinks ? `Nearby cities: ${nearbyLinks}. ` : ""}<a href="/community/${combo.community}">${esc(comm.h1)}</a> · <a href="/cities/${combo.citySlug}">All stores in ${esc(city.display)}</a></p>
<p>Categories: ${catLinks}</p>`;

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: matched.length,
    itemListElement: matched.slice(0, 24).map((L, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${base}/stores/${publicStoreSlug(L)}`,
      name: L.role || "Store",
    })),
  };

  const webPage = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: pageUrl,
    isPartOf: { "@type": "WebSite", name: "Clip Services", url: base },
  };

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(webPage)}
${jsonLdScript(itemList)}
</head>
<body style="font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Browse stores</a> · <a href="/blog">Blog</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A;font-size:clamp(1.35rem,4vw,1.85rem)">${esc(comm.h1)} in ${esc(city.display)}</h1>
<p>${esc(comm.intro.slice(0, 500))}</p>
<p>${esc(intro2)}</p>
<h2 style="font-size:1.15rem;margin-top:28px">Popular ${esc(combo.community)} stores in ${esc(city.display)}</h2>
${listHtml}
<h2 style="font-size:1.1rem;margin-top:32px">More in ${esc(city.display)}</h2>
<p>See every independent on our <a href="/cities/${combo.citySlug}">${esc(city.display)} city page</a> and browse <a href="/community/${combo.community}">all ${esc(combo.community)} stores UK-wide</a>.</p>
${related}
<p style="margin-top:24px"><a href="/store-owner" style="font-weight:700;color:#8B3A3A">List your store</a></p>
</body>
</html>`;
}
