import {
  getMarketplaceListingById,
  getMarketplaceListingByPublicSlug,
} from "../kv-store.js";
import { siteUrl } from "../site-url.js";
import { esc, jsonLdScript, slugify, publicStoreSlug } from "../seo-html.js";
import { inferPrimaryCommunity, CITY_SLUGS, CITY_COPY } from "../seo-data.js";
import { getComboPageHtml } from "./combo-html.js";

function prettyCommKey(k) {
  if (!k) return "African, Caribbean & Asian";
  return k
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function citySlugFromDisplay(display) {
  const n = String(display || "").toLowerCase().trim();
  if (!n) return null;
  for (const s of CITY_SLUGS) {
    if (CITY_COPY[s]?.display.toLowerCase() === n) return s;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Method Not Allowed");
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  const idParam = String(url.searchParams.get("id") || "").trim();
  const slugParam = String(url.searchParams.get("slug") || "").trim();

  let listing = null;
  try {
    if (slugParam) {
      listing = await getMarketplaceListingByPublicSlug(slugParam);
    } else if (idParam) {
      listing = await getMarketplaceListingById(idParam);
    }
  } catch (e) {
    console.error("STORE_HTML", e);
    listing = null;
  }

  if (!listing && slugParam) {
    try {
      const comboHtml = await getComboPageHtml(slugParam);
      if (comboHtml) {
        res.statusCode = 200;
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
        res.end(comboHtml);
        return;
      }
    } catch (e) {
      console.error("STORE_HTML_COMBO", e);
    }
  }

  if (!listing) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      `<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Store not found</title></head><body style="font-family:system-ui,sans-serif;padding:24px;background:#F5F0E8;color:#2C1810"><p>Store not found.</p><p><a href="/stores">Browse stores</a></p></body></html>`
    );
    return;
  }

  if (listing.applicationStatus === "pending") {
    const base = siteUrl();
    const name = esc(listing.role || "Application");
    const ref = esc(String(listing.applicationRef || listing.id || ""));
    res.statusCode = 200;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("cache-control", "private, no-store");
    res.end(`<!DOCTYPE html><html lang="en-GB"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Under review — ${name}</title><meta name="robots" content="noindex,nofollow"></head><body style="font-family:Inter,system-ui,sans-serif;padding:32px 20px;background:#F5F0E8;color:#2C1810;max-width:560px;margin:0 auto;line-height:1.6"><h1 style="color:#8B3A3A;font-family:Georgia,serif">${name}</h1><p>This store profile is <strong>under review</strong>. It is not visible in the public directory yet.</p><p>Reference: <strong>${ref}</strong></p><p>Questions? <a href="https://wa.me/447487588706">WhatsApp Clip Services</a> · <a href="/stores">Browse live stores</a></p></body></html>`);
    return;
  }

  const base = siteUrl();
  const ogImage = `${base}/icons/clip-logo-full.svg`;
  const slug = publicStoreSlug(listing);
  const pageUrl = `${base}/stores/${encodeURIComponent(slug)}`;
  const name = listing.role || "Independent store";
  const bio = (listing.bio || "").slice(0, 500);
  const city = typeof listing.city === "string" ? listing.city.trim() : "";
  const hours =
    typeof listing.openingHours === "string" && listing.openingHours.trim()
      ? listing.openingHours.trim()
      : "Hours on request — confirm when you order.";
  const pc = inferPrimaryCommunity(listing);
  const commLabel = prettyCommKey(pc);
  const h1Seo = city ? `${name} — ${city} ${commLabel} store` : `${name} — ${commLabel} store`;
  const titleSeo = `${h1Seo} | Clip Services`;
  const desc =
    (bio ? `${bio.slice(0, 200)} — ` : "") +
    `${name}${city ? ` — ${commLabel} grocery store in ${city}` : ` — ${commLabel} store UK`}. Order online on Clip Services with Stripe.`;
  const seoPara = `${name} is an independent ${commLabel.toLowerCase()} seller on Clip Services${city ? `, for shoppers looking for African, Caribbean and Asian groceries and cultural products in ${city}` : ""}. Browse the live product grid below, add items to your basket, and pay securely. Many traders send WhatsApp updates when your order is confirmed or ready. Customer reviews and ratings will build on this page as the community grows — thank you for supporting local independents.`;
  const citySlug = citySlugFromDisplay(city);
  const internalNav = [
    citySlug ? `<a href="/cities/${citySlug}">More stores in ${esc(city)}</a>` : `<a href="/cities/manchester">City guides</a>`,
    `<a href="/community/${pc || "african"}">${esc(commLabel)} stores UK</a>`,
    `<a href="/categories/spices-ingredients">Spices &amp; ingredients</a>`,
    `<a href="/categories/fresh-produce">Fresh produce</a>`,
    `<a href="/blog">Blog</a>`,
  ].join(" · ");

  const priceList = Array.isArray(listing.priceList) ? listing.priceList : [];
  const listingId = String(listing.id || "");
  const listingJson = JSON.stringify({
    id: listingId,
    slug,
    priceList: priceList.map((r) => ({
      item: String(r?.item || "").slice(0, 120),
      price: String(r?.price || "").slice(0, 40),
    })),
  }).replace(/</g, "\\u003c");

  const graph = [
    {
      "@type": "LocalBusiness",
      "@id": `${pageUrl}#business`,
      name,
      description: bio || undefined,
      url: pageUrl,
      image: ogImage,
      address: {
        "@type": "PostalAddress",
        addressCountry: "GB",
        addressLocality: city || undefined,
      },
    },
    ...priceList.slice(0, 24).map((row, i) => {
      const itemName = String(row?.item || `Item ${i + 1}`).slice(0, 140);
      const pslug = slugify(itemName);
      const productUrl = `${base}/store/${encodeURIComponent(listingId)}/p/${i}/${pslug}`;
      const priceNum = String(row?.price || "")
        .replace(/[^0-9.]/g, "")
        .slice(0, 12);
      return {
        "@type": "Product",
        name: itemName,
        url: productUrl,
        offers: {
          "@type": "Offer",
          priceCurrency: "GBP",
          price: priceNum || "0",
          availability: "https://schema.org/InStock",
          url: productUrl,
        },
      };
    }),
  ];

  const structured = { "@context": "https://schema.org", "@graph": graph };

  const productGrid =
    priceList.length > 0
      ? `<div class="grid" id="product-grid">${priceList
          .map((r, i) => {
            const pslug = slugify(r.item);
            const pu = `/store/${encodeURIComponent(listingId)}/p/${i}/${pslug}`;
            const prodSeo = `/products/${encodeURIComponent(pslug)}`;
            return `<article class="pcard" data-idx="${i}">
  <a class="plink" href="${pu}"><span class="pname">${esc(r.item)}</span></a>
  <p class="pprice">${esc(r.price)}</p>
  <div class="prow">
    <button type="button" class="btn-add" data-add="${i}">Add to basket</button>
    <a class="plink-small" href="${pu}">Details</a>
  </div>
  <p class="plink-small" style="margin-top:8px"><a href="${prodSeo}">See all UK stores stocking this</a></p>
</article>`;
          })
          .join("")}</div>`
      : `<p class="muted"><em>Product list coming soon — we’re updating this store.</em></p>`;

  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titleSeo.slice(0, 120))}</title>
<meta name="description" content="${esc(desc.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Clip Services">
<meta property="og:title" content="${esc(titleSeo.slice(0, 90))}">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:alt" content="${esc(name)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titleSeo.slice(0, 90))}">
<meta name="twitter:description" content="${esc(desc.slice(0, 200))}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(structured)}
<style>
:root{--terracotta:#8B3A3A;--gold:#D4A017;--cream:#F5F0E8;--brown:#2C1810;--card:#fffdf8}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;color:var(--brown);background:var(--cream);line-height:1.5;min-height:100vh;padding-bottom:120px}
a{color:var(--terracotta);font-weight:600}
.wrap{max-width:720px;margin:0 auto;padding:16px}
.hero{background:linear-gradient(135deg,#8B3A3A 0%,#6b2d2d 100%);color:#fff;border-radius:16px;padding:20px 20px 24px;margin-bottom:20px;box-shadow:0 8px 24px rgba(44,24,16,.12)}
.hero h1{font-family:"Playfair Display",Georgia,serif;font-size:1.65rem;margin:0 0 8px;line-height:1.2}
.hero .meta{font-size:.95rem;opacity:.95}
.hero .bio{margin:12px 0 0;font-size:.95rem;opacity:.98}
.tag{display:inline-block;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:999px;font-size:.78rem;margin-top:10px}
.nav{margin-bottom:16px;font-size:.9rem}
.nav a{color:var(--terracotta)}
h2{font-family:"Playfair Display",Georgia,serif;color:var(--terracotta);font-size:1.25rem;margin:24px 0 12px}
.grid{display:grid;gap:12px}
@media(min-width:520px){.grid{grid-template-columns:1fr 1fr}}
.pcard{background:var(--card);border-radius:12px;padding:14px;border:1px solid rgba(139,58,58,.15);box-shadow:0 2px 8px rgba(44,24,16,.06)}
.pname{font-weight:700;display:block;color:var(--brown);text-decoration:none;font-size:1rem}
.pprice{color:var(--terracotta);font-weight:700;margin:6px 0 10px}
.prow{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn-add{background:var(--terracotta);color:#fff;border:none;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer;font-size:.9rem;width:100%}
.btn-add:active{transform:scale(.98)}
.plink-small{font-size:.85rem;font-weight:600}
.reviews{background:var(--card);border-radius:12px;padding:16px;border:1px dashed rgba(139,58,58,.25)}
.muted{color:#5c4033}
.checkout-panel{position:fixed;left:0;right:0;bottom:0;background:linear-gradient(180deg,#fffdf8,#F5F0E8);border-top:2px solid var(--gold);padding:12px 16px 16px;box-shadow:0 -8px 24px rgba(44,24,16,.12);z-index:50}
.checkout-panel .inner{max-width:720px;margin:0 auto}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:8px}
.badge{background:var(--terracotta);color:#fff;padding:6px 12px;border-radius:999px;font-weight:700;font-size:.9rem}
.btn-pay{background:var(--gold);color:var(--brown);border:none;padding:12px 18px;border-radius:12px;font-weight:700;cursor:pointer;width:100%;font-size:1rem}
.btn-pay:disabled{opacity:.5;cursor:not-allowed}
dialog{border:none;border-radius:16px;padding:0;max-width:calc(100% - 24px);width:420px;background:var(--card);color:var(--brown);box-shadow:0 16px 48px rgba(0,0,0,.2)}
dialog::backdrop{background:rgba(44,24,16,.45)}
.dlg-head{background:var(--terracotta);color:#fff;padding:16px 18px;font-family:"Playfair Display",Georgia,serif;font-size:1.15rem}
.dlg-body{padding:16px 18px 20px}
label{display:block;font-size:.8rem;font-weight:600;margin-bottom:4px;color:#5c4033}
input[type=text],input[type=email],input[type=tel]{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(139,58,58,.3);font-size:1rem;margin-bottom:12px}
.ful-row{display:flex;gap:16px;margin:12px 0;flex-wrap:wrap}
.err{color:#b00020;font-size:.85rem;margin-top:8px;min-height:1.2em}
</style>
</head>
<body>
<div class="wrap">
<p class="nav"><a href="/">← Home</a> · <a href="/stores">All stores</a></p>
<div class="hero">
<h1>${esc(h1Seo)}</h1>
<p class="meta">${city ? `${esc(city)} · ` : ""}UK independent store</p>
${bio ? `<p class="bio">${esc(bio)}</p>` : ""}
<p class="bio" style="margin-top:14px;font-size:0.95rem;line-height:1.55">${esc(seoPara)}</p>
<p class="meta" style="margin-top:10px"><strong>Opening</strong> — ${esc(hours)}</p>
<span class="tag">Stripe secure checkout</span>
</div>

<p style="font-size:0.9rem;line-height:1.6;margin:0 0 8px"><strong>Explore</strong> — ${internalNav}</p>

<h2>Shop</h2>
${productGrid}

<h2>Reviews</h2>
<div class="reviews">
<p class="muted">Customer reviews and ratings will appear here as orders arrive. Thank you for supporting local independents.</p>
</div>
</div>

<div class="checkout-panel" id="dock">
  <div class="inner">
    <div class="row">
      <span class="badge" id="cart-count">Basket: 0 items</span>
      <button type="button" class="btn-pay" id="open-checkout" disabled>Pay securely</button>
    </div>
  </div>
</div>

<dialog id="checkout-dlg">
  <form method="dialog" id="checkout-form">
    <div class="dlg-head">Checkout</div>
    <div class="dlg-body">
      <p class="muted" style="margin-top:0;font-size:.9rem" id="order-summary"></p>
      <div class="ful-row">
        <label><input type="radio" name="fulfillment" value="collection" checked> Collection</label>
        <label><input type="radio" name="fulfillment" value="delivery"> Delivery</label>
      </div>
      <label for="fn">First name</label>
      <input type="text" id="fn" name="firstName" autocomplete="given-name" required>
      <label for="ln">Last name</label>
      <input type="text" id="ln" name="lastName" autocomplete="family-name" required>
      <label for="em">Email</label>
      <input type="email" id="em" name="email" autocomplete="email" required>
      <label for="ph">Phone</label>
      <input type="tel" id="ph" name="phone" autocomplete="tel" required>
      <label><input type="checkbox" id="consent" required> I agree to the <a href="/terms.html" target="_blank" rel="noopener">terms</a> and processing of my data for this order.</label>
      <div class="err" id="pay-err"></div>
      <button type="submit" class="btn-pay" id="submit-pay">Go to Stripe</button>
    </div>
  </form>
</dialog>

<script type="application/json" id="store-json">${listingJson}</script>
<script>
(function(){
  var el = document.getElementById("store-json");
  var STORE = JSON.parse(el.textContent);
  var CART_KEY = "clipCart:" + STORE.id;
  function getCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch(e){ return {}; } }
  function setCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); }
  function countItems(c){ var n = 0; for (var k in c) n += c[k]|0; return n; }
  function render(){
    var c = getCart();
    var n = countItems(c);
    document.getElementById("cart-count").textContent = "Basket: " + n + " item" + (n === 1 ? "" : "s");
    document.getElementById("open-checkout").disabled = n < 1;
  }
  document.getElementById("product-grid") && document.getElementById("product-grid").addEventListener("click", function(ev){
    var t = ev.target;
    if (t && t.getAttribute("data-add") != null) {
      var idx = t.getAttribute("data-add");
      var c = getCart();
      c[idx] = (c[idx]|0) + 1;
      setCart(c);
      render();
    }
  });
  var dlg = document.getElementById("checkout-dlg");
  document.getElementById("open-checkout").addEventListener("click", function(){
    var c = getCart();
    var lines = [];
    var summary = [];
    for (var k in c) {
      var qty = c[k]|0;
      if (qty < 1) continue;
      var i = k|0;
      var row = STORE.priceList[i];
      if (!row) continue;
      lines.push({ idx: i, qty: qty });
      summary.push(qty + "× " + row.item);
    }
    document.getElementById("order-summary").textContent = summary.join(" · ");
    document.getElementById("pay-err").textContent = "";
    dlg.showModal();
  });
  document.getElementById("checkout-form").addEventListener("submit", async function(ev){
    ev.preventDefault();
    var err = document.getElementById("pay-err");
    err.textContent = "";
    var c = getCart();
    var cartLines = [];
    for (var k in c) {
      var qty = c[k]|0;
      if (qty < 1) continue;
      cartLines.push({ idx: k|0, qty: qty });
    }
    if (!cartLines.length) { err.textContent = "Basket is empty."; return; }
    var fd = new FormData(document.getElementById("checkout-form"));
    var fulfillment = (document.querySelector("input[name=fulfillment]:checked") || {}).value || "collection";
    var body = {
      listingId: STORE.id,
      cartLines: cartLines,
      firstName: (document.getElementById("fn").value || "").trim(),
      lastName: (document.getElementById("ln").value || "").trim(),
      email: (document.getElementById("em").value || "").trim(),
      phone: (document.getElementById("ph").value || "").trim(),
      consent: document.getElementById("consent").checked,
      fulfillment: fulfillment
    };
    var btn = document.getElementById("submit-pay");
    btn.disabled = true;
    try {
      var r = await fetch("/api/stripe-checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      var data = await r.json();
      if (data.url) { window.location.href = data.url; return; }
      err.textContent = data.error || "Could not start checkout.";
    } catch (e) {
      err.textContent = "Network error. Try again.";
    }
    btn.disabled = false;
  });
  render();
})();
</script>
</body>
</html>`;

  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.setHeader("cache-control", "public, max-age=120, s-maxage=300");
  res.end(html);
}
