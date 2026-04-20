import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { CITY_SLUGS, CATEGORY_SLUGS } from "../seo-data.js";
import { slugify } from "../seo-html.js";

function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const base = siteUrl();
  const now = new Date().toISOString().split("T")[0];

  const staticUrls = [
    { loc: `${base}/`, changefreq: "daily", priority: "1.0" },
    { loc: `${base}/stores`, changefreq: "daily", priority: "0.95" },
    { loc: `${base}/store-owner`, changefreq: "weekly", priority: "0.85" },
  ];

  for (const c of CITY_SLUGS) {
    staticUrls.push({
      loc: `${base}/cities/${c}`,
      changefreq: "weekly",
      priority: "0.9",
    });
  }

  for (const s of CATEGORY_SLUGS) {
    staticUrls.push({
      loc: `${base}/categories/${s}`,
      changefreq: "weekly",
      priority: "0.88",
    });
  }

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("SITEMAP_LISTINGS", e);
  }

  const storeUrls = [];
  for (const row of listings) {
    const id = String(row?.id || "").trim();
    if (!id) continue;
    storeUrls.push({
      loc: `${base}/store/${encodeURIComponent(id)}`,
      changefreq: "weekly",
      priority: "0.85",
    });
    const priceList = Array.isArray(row.priceList) ? row.priceList : [];
    priceList.forEach((row, idx) => {
      const item = String(row?.item || "").trim();
      if (!item) return;
      const ps = slugify(item);
      storeUrls.push({
        loc: `${base}/store/${encodeURIComponent(id)}/p/${idx}/${ps}`,
        changefreq: "weekly",
        priority: "0.75",
      });
    });
  }

  const all = [...staticUrls, ...storeUrls];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all
  .map(
    (u) => `  <url>
    <loc>${xmlEscape(u.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.statusCode = 200;
  res.setHeader("content-type", "application/xml; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=3600, s-maxage=3600");
  res.end(body);
}
