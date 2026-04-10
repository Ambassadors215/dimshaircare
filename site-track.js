/* Clip Services — anonymous page-view beacon (see Admin → Site visits) */
(function () {
  if (typeof fetch === "undefined" && typeof navigator === "undefined") return;
  try {
    var p = (location.pathname || "/") + (location.search || "");
    if (p.length > 480) p = p.slice(0, 480);
    var r = document.referrer || "";
    if (r.length > 480) r = r.slice(0, 480);
    var h = location.href || "";
    if (h.length > 480) h = h.slice(0, 480);
    var body = JSON.stringify({ path: p, ref: r, href: h });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track-visit", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track-visit", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: body,
        keepalive: true,
      }).catch(function () {});
    }
  } catch (e) {}
})();
