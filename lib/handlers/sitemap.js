import { getMarketplaceListings } from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import {
  CITY_SLUGS,
  CATEGORY_SLUGS,
  COMMUNITY_SLUGS,
  COMBO_PAGES,
} from "../seo-data.js";
import { slugify, publicStoreSlug } from "../seo-html.js";
import { BLOG_POSTS } from "../blog-data.js";

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
    { loc: `${base}/market-stall`, changefreq: "weekly", priority: "0.75" },
    { loc: `${base}/impact`, changefreq: "weekly", priority: "0.7" },
    { loc: `${base}/blog`, changefreq: "weekly", priority: "0.82" },
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

  for (const s of COMMUNITY_SLUGS) {
    staticUrls.push({
      loc: `${base}/community/${s}`,
      changefreq: "weekly",
      priority: "0.87",
    });
  }

  for (const c of COMBO_PAGES) {
    staticUrls.push({
      loc: `${base}/stores/${encodeURIComponent(c.slug)}`,
      changefreq: "weekly",
      priority: "0.89",
    });
  }

  for (const post of BLOG_POSTS) {
    staticUrls.push({
      loc: `${base}/blog/${encodeURIComponent(post.slug)}`,
      changefreq: "monthly",
      priority: "0.78",
    });
  }

  let listings = [];
  try {
    listings = await getMarketplaceListings();
  } catch (e) {
    console.error("SITEMAP_LISTINGS", e);
  }

  const productSlugs = new Set();
  const storeUrls = [];

  for (const row of listings) {
    const id = String(row?.id || "").trim();
    if (!id) continue;
    const pubSlug = publicStoreSlug(row);
    storeUrls.push({
      loc: `${base}/stores/${encodeURIComponent(pubSlug)}`,
      changefreq: "weekly",
      priority: "0.85",
    });
    const priceList = Array.isArray(row.priceList) ? row.priceList : [];
    priceList.forEach((pr, idx) => {
      const item = String(pr?.item || "").trim();
      if (!item) return;
      const ps = slugify(item);
      productSlugs.add(ps);
      storeUrls.push({
        loc: `${base}/store/${encodeURIComponent(id)}/p/${idx}/${slugify(item)}`,
        changefreq: "weekly",
        priority: "0.75",
      });
    });
  }

  for (const ps of productSlugs) {
    storeUrls.push({
      loc: `${base}/products/${encodeURIComponent(ps)}`,
      changefreq: "weekly",
      priority: "0.76",
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
