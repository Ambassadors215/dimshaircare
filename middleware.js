/**
 * Host-based homepage: Dim's Haircare on the dimshaircare Vercel project (production + preview URLs).
 * Clip Services stays default for clipservice.app, clips-service*.vercel.app, etc.
 * Custom domains: add host strings to EXTRA_HAIR_HOSTS (see DEPLOYMENT.md).
 */
const EXTRA_HAIR_HOSTS = new Set([
  // "dimshaircare.co.uk",
  // "www.dimshaircare.co.uk",
]);

function isHairHomeHost(host) {
  const h = host.toLowerCase();
  if (EXTRA_HAIR_HOSTS.has(h)) return true;
  if (h === "dimshaircare.vercel.app" || h === "www.dimshaircare.vercel.app") return true;
  // Preview deployments: dimshaircare-git-main-*.vercel.app
  if (/^dimshaircare-.+\.vercel\.app$/.test(h)) return true;
  return false;
}

export const config = {
  matcher: "/",
};

export default async function middleware(request) {
  const url = new URL(request.url);
  const host = (request.headers.get("host") || "").split(":")[0];
  if (url.pathname === "/" && isHairHomeHost(host)) {
    url.pathname = "/dimshaircare.html";
    return fetch(new Request(url.toString(), request));
  }
  return fetch(request);
}
