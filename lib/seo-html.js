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
