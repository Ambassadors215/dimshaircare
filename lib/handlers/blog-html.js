import { siteUrl } from "../site-url.js";
import { BLOG_POSTS, getPostBySlug } from "../blog-data.js";
import { esc, jsonLdScript } from "../seo-html.js";

const OG = () => `${siteUrl()}/icons/clip-logo-full.svg`;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const slug = String(url.searchParams.get("slug") || "").trim();

  if (!slug) {
    return indexPage(req, res);
  }

  const post = getPostBySlug(slug);
  if (!post) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(`<!DOCTYPE html><html><head><title>Not found</title></head><body><p>Article not found.</p><p><a href="/blog">Blog</a></p></body></html>`);
    return;
  }

  const base = siteUrl();
  const pageUrl = `${base}/blog/${encodeURIComponent(post.slug)}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.datePublished,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Clip Services",
      logo: { "@type": "ImageObject", url: `${base}/icons/clip-logo-full.svg` },
    },
    mainEntityOfPage: pageUrl,
    image: OG(),
  };

  const body = post.sections
    .map((sec) => `<h2>${esc(sec.h2)}</h2>\n${sec.html}`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(post.title)} | Clip Services Blog</title>
<meta name="description" content="${esc(post.metaDescription)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(post.metaDescription)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(articleLd)}
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>body{font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.7}h1{font-family:"Playfair Display",Georgia,serif;color:#8B3A3A}h2{font-size:1.15rem;margin-top:28px;color:#5C4033}a{color:#8B3A3A;font-weight:600}</style>
</head>
<body>
<p><a href="/">← Home</a> · <a href="/blog">Blog</a> · <a href="/stores">Stores</a></p>
<article>
<h1>${esc(post.title)}</h1>
<p style="color:#5C4033;font-size:14px">${esc(post.datePublished)} · ${esc(post.author)}</p>
${body}
</article>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=300, s-maxage=600");
  res.end(html);
}

function indexPage(req, res) {
  const base = siteUrl();
  const pageUrl = `${base}/blog`;

  const list = BLOG_POSTS.map(
    (p) =>
      `<li style="margin-bottom:16px"><a href="/blog/${encodeURIComponent(p.slug)}" style="font-weight:700;font-size:1.1rem">${esc(p.title)}</a><br><span style="color:#5C4033;font-size:14px">${esc(p.metaDescription.slice(0, 140))}…</span></li>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Clip Services Blog — African, Caribbean & Asian Food UK</title>
<meta name="description" content="Guides to African, Caribbean and Asian grocery shopping in the UK: cities, ingredients, halal, and independents on Clip Services.">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:title" content="Clip Services Blog">
<meta property="og:description" content="Food guides, city shopping tips, and community retail on Clip Services.">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${OG()}">
<meta name="theme-color" content="#8B3A3A">
</head>
<body style="font-family:Inter,system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;color:#2C1810;background:#F5F0E8;line-height:1.65">
<p><a href="/">← Home</a> · <a href="/stores">Stores</a></p>
<h1 style="font-family:Georgia,serif;color:#8B3A3A">Blog</h1>
<p>Practical guides for shopping African, Caribbean and Asian groceries online and in your city — with links to independents on Clip Services.</p>
<ul style="list-style:none;padding:0">${list}</ul>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=300, s-maxage=600");
  res.end(html);
}
