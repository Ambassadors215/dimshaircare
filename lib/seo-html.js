/** Escape text for HTML body and attributes. */
export function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON-LD script (safe: stringify + escape </script>). */
export function jsonLdScript(obj) {
  const raw = JSON.stringify(obj, null, 0);
  const safe = raw.replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${safe}</script>`;
}

export function slugify(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "item";
}

/** Public URL segment for /stores/[slug] — stable from listing id + name. */
export function publicStoreSlug(listing) {
  const id = String(listing?.id || "x")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 24);
  const base = slugify(listing?.role || "store");
  return `${base}-${id}`.replace(/-+/g, "-").toLowerCase().slice(0, 120);
}
