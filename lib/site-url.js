/** Canonical public origin for SEO, sitemaps, and canonical URLs. Uses SITE_URL or PUBLIC_SITE_URL on Vercel. */
export function siteUrl() {
  const u = process.env.PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "https://clipservice.app";
}
