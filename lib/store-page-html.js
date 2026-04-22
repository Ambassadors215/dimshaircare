/**
 * Full /stores/[slug] experience — conversion-focused layout (SSR + client cart/checkout).
 */
import { esc, jsonLdScript, slugify, publicStoreSlug } from "./seo-html.js";
import { inferPrimaryCommunity } from "./seo-data.js";
import { siteUrl } from "./site-url.js";

const CAT_LABELS = {
  all: "All",
  "fresh-produce": "Fresh Produce",
  "meat-fish": "Meat & Fish",
  groceries: "Groceries",
  snacks: "Snacks",
  drinks: "Drinks",
  "hair-beauty": "Hair & Beauty",
  fashion: "Fashion",
  halal: "Halal",
  spices: "Spices",
  frozen: "Frozen",
  default: "Groceries",
};

function labelForCategory(slug) {
  const k = String(slug || "")
    .toLowerCase()
    .trim();
  return CAT_LABELS[k] || k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Other";
}

function normCatKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "groceries";
}

function waDigits(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "44" + d.slice(1);
  else if (d.length >= 10 && !d.startsWith("44")) d = "44" + d;
  return d.length >= 10 ? d : "";
}

function prettyCommKey(k) {
  if (!k) return "African, Caribbean & Asian";
  return k
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function capPhoto(s, max = 120000) {
  if (typeof s !== "string" || !s.startsWith("data:")) return "";
  return s.length <= max ? s : "";
}

function parsePriceNum(row) {
  const n = parseFloat(String(row?.price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function starRow(n) {
  const r = Math.min(5, Math.max(0, Math.round(Number(n) || 0)));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

/**
 * @param {object} listing
 * @param {object} opts
 * @param {object[]} opts.similarStores
 */
export function buildStorePageHtml(listing, opts) {
  const base = opts.base || siteUrl();
  const similarStores = Array.isArray(opts.similarStores) ? opts.similarStores : [];
  const slug = publicStoreSlug(listing);
  const pageUrl = `${base}/stores/${encodeURIComponent(slug)}`;
  const name = listing.role || "Independent store";
  const city = typeof listing.city === "string" ? listing.city.trim() : "";
  const pc = inferPrimaryCommunity(listing);
  const commLabel = prettyCommKey(pc);
  const storeOpen = listing.storeOpen !== false;
  const priceList = Array.isArray(listing.priceList) ? listing.priceList : [];
  const storeProducts = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
  const reviewsArr = Array.isArray(listing.reviews) ? listing.reviews : [];
  const bio = String(listing.bio || "").trim();
  const hours =
    typeof listing.openingHours === "string" && listing.openingHours.trim()
      ? listing.openingHours.trim()
      : "Hours confirmed when you order";
  const heroImg =
    typeof listing.storePhotoData === "string" && listing.storePhotoData.startsWith("data:")
      ? listing.storePhotoData
      : "";
  const verified =
    listing.applicationStatus === "approved" ||
    listing.applicationStatus === undefined ||
    listing.applicationStatus === null ||
    listing.applicationStatus === "";
  const wa = waDigits(listing.whatsappPhone);
  const waStoreUrl = wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Hi — I'm browsing your Clip Services store and have a question.")}` : "";

  let sum = 0;
  let count = 0;
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviewsArr) {
    const rv = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
    sum += rv;
    count += 1;
    dist[rv] = (dist[rv] || 0) + 1;
  }
  const avgRating = count ? Math.round((sum / count) * 10) / 10 : 0;
  let mostHelpful = null;
  for (const r of reviewsArr) {
    if (!mostHelpful || String(r.text || "").length > String(mostHelpful.text || "").length) mostHelpful = r;
  }

  const products = priceList.map((row, i) => {
    const sp = storeProducts[i] || {};
    const cat = normCatKey(sp.category || row?.category || "groceries");
    return {
      idx: i,
      item: String(row?.item || sp?.name || "").slice(0, 120),
      priceStr: String(row?.price || "").slice(0, 40),
      priceNum: parsePriceNum(row),
      inStock: sp.inStock !== false,
      featured: Boolean(sp.featured),
      lowStock: sp.lowStock === true,
      category: cat,
      description: String(sp.description || "").slice(0, 160),
      photoData: capPhoto(sp.photoData),
    };
  });

  const catSet = new Set(["all"]);
  products.forEach((p) => catSet.add(p.category));
  const filterCats = Array.from(catSet).filter((c) => c !== "all");
  filterCats.sort((a, b) => labelForCategory(a).localeCompare(labelForCategory(b)));
  const filterOrder = [
    "all",
    "fresh-produce",
    "meat-fish",
    "groceries",
    "snacks",
    "drinks",
    "hair-beauty",
    "fashion",
    "halal",
  ];
  const orderedFilters = ["all"];
  for (const k of filterOrder) {
    if (k !== "all" && catSet.has(k)) orderedFilters.push(k);
  }
  for (const k of filterCats) {
    if (!orderedFilters.includes(k)) orderedFilters.push(k);
  }

  const popularIdx = [];
  const seen = new Set();
  for (const p of products) {
    if (p.featured && p.inStock && popularIdx.length < 4 && !seen.has(p.idx)) {
      popularIdx.push(p.idx);
      seen.add(p.idx);
    }
  }
  for (const p of products) {
    if (popularIdx.length >= 4) break;
    if (p.inStock && !seen.has(p.idx)) {
      popularIdx.push(p.idx);
      seen.add(p.idx);
    }
  }

  const titleSeo = city
    ? `${esc(name)} — ${esc(city)} African, Caribbean & Asian Store | Order Online | Clip Services`
    : `${esc(name)} — Order Online | African, Caribbean & Asian Store | Clip Services`;
  const desc =
    `Order authentic ${commLabel.toLowerCase()} products from ${name}${city ? ` in ${city}` : ""}. ` +
    `Fresh groceries, halal, hair and beauty and more. Secure Stripe payments. Collect or get delivery.`;

  const ogImage = heroImg || `${base}/icons/clip-logo-full.svg`;
  const listingId = String(listing.id || "");

  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${pageUrl}#business`,
        name,
        description: bio || desc,
        url: pageUrl,
        image: ogImage,
        address: { "@type": "PostalAddress", addressCountry: "GB", addressLocality: city || undefined },
        ...(count
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: String(avgRating),
                reviewCount: String(count),
              },
            }
          : {}),
      },
      ...products.slice(0, 5).map((p) => {
        const pslug = slugify(p.item);
        const productUrl = `${base}/store/${encodeURIComponent(listingId)}/p/${p.idx}/${pslug}`;
        return {
          "@type": "Product",
          name: p.item,
          url: productUrl,
          offers: {
            "@type": "Offer",
            priceCurrency: "GBP",
            price: String(p.priceNum || 0),
            availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: productUrl,
          },
        };
      }),
    ],
  };

  const closedBanner = storeOpen
    ? ""
    : `<div class="closed-strip" role="status">Orders are paused — this store is closed right now.</div>`;

  const openBadge = storeOpen
    ? `<span class="open-badge ok">🟢 Open now</span>`
    : `<span class="open-badge no">🔴 Closed — ${esc(hours.split(",")[0] || "see hours below")}</span>`;

  const ratingBlock =
    count > 0
      ? `<span class="rating-line" aria-label="Average ${avgRating} of 5">${starRow(avgRating)} <strong>${avgRating}</strong> · ${count} review${count === 1 ? "" : "s"}</span>`
      : `<span class="muted">New on Clip — reviews appear after orders</span>`;

  const heroImgTag = heroImg
    ? `<img class="hero-bg" src="${heroImg.replace(/"/g, "&quot;")}" alt="${esc(name)} — store photo" fetchpriority="high" />`
    : `<div class="hero-fallback" aria-hidden="true"></div>`;

  const descShort = bio.length > 220 ? `${esc(bio.slice(0, 220))}…` : esc(bio);
  const descFull = esc(bio);

  function cardHtml(p, popular) {
    const oos = !p.inStock;
    const ph = p.photoData
      ? `<img class="pimg" src="${p.photoData.replace(/"/g, "&quot;")}" alt="${esc(p.item)}" loading="lazy" width="400" height="400" />`
      : `<div class="pimg pholder" aria-hidden="true"></div>`;
    const urg =
      popular && p.featured
        ? `<span class="urg hot">🔥 Popular item</span>`
        : p.lowStock
          ? `<span class="urg low">⚠️ Low stock</span>`
          : "";
    return `<article class="pcard ${oos ? "oos" : ""}" data-idx="${p.idx}" data-cat="${esc(p.category)}">
  ${urg}
  ${oos ? `<span class="oos-badge">Out of stock</span>` : ""}
  <div class="pimg-wrap ${oos ? "dim" : ""}">${ph}</div>
  <h3 class="pname">${esc(p.item)}</h3>
  <p class="pprice">£${p.priceNum.toFixed(2)}</p>
  <p class="pdesc">${esc(p.description)}</p>
  <div class="pactions">
    ${
      oos || !storeOpen
        ? `<button type="button" class="btn-add" disabled>Unavailable</button>`
        : `<div class="add-row" data-add-wrap="${p.idx}">
      <button type="button" class="btn-add" data-add="${p.idx}">+ Add</button>
      <div class="qty hidden" data-qty-row="${p.idx}">
        <button type="button" class="qbtn" data-dec="${p.idx}" aria-label="Decrease">−</button>
        <span class="qv" data-qty="${p.idx}">1</span>
        <button type="button" class="qbtn" data-inc="${p.idx}" aria-label="Increase">+</button>
      </div>
      <span class="added hidden" data-added="${p.idx}">Added ✓</span>
    </div>`
    }
  </div>
</article>`;
  }

  const popularHtml = popularIdx.length
    ? `<section class="pop-sec" aria-labelledby="pop-h"><h2 id="pop-h">Popular at this store</h2><div class="pgrid pop">${popularIdx
        .map((ix) => {
          const p = products.find((x) => x.idx === ix);
          return p ? cardHtml(p, true) : "";
        })
        .join("")}</div></section>`
    : "";

  const mainProducts = products.filter((p) => !popularIdx.includes(p.idx));
  const mainGrid = `<div class="pgrid main" id="catalogue">${mainProducts.map((p) => cardHtml(p, false)).join("")}</div>`;

  const filterPills = orderedFilters
    .map((k) => `<button type="button" class="fil-pill ${k === "all" ? "on" : ""}" data-filter="${esc(k)}">${esc(labelForCategory(k === "all" ? "all" : k))}</button>`)
    .join("");

  const reviewsSummary =
    count > 0
      ? `<div class="rev-sum">
  <div class="rev-big">${avgRating}<span class="muted small">/5</span></div>
  <div>${starRow(avgRating)}<div class="muted">${count} reviews</div></div>
  <div class="bars">${[5, 4, 3, 2, 1]
    .map((n) => {
      const c = dist[n] || 0;
      const pct = count ? Math.round((c / count) * 100) : 0;
      return `<div class="bar-row"><span>${n}★</span><div class="bar"><i style="width:${pct}%"></i></div><span>${c}</span></div>`;
    })
    .join("")}</div>
</div>`
      : "";

  const goldReview =
    mostHelpful && String(mostHelpful.text || "").trim()
      ? `<div class="gold-rev"><p class="stars">${starRow(mostHelpful.rating)}</p><p>${esc(String(mostHelpful.text))}</p><p class="muted">${esc(String(mostHelpful.customerFirstName || "Customer"))} · ${esc(String(mostHelpful.productName || ""))}</p></div>`
      : "";

  const reviewsList = reviewsArr.length
    ? reviewsArr
        .map((r) => {
          const reply =
            r.reply && String(r.reply).trim()
              ? `<p class="reply"><strong>Store:</strong> ${esc(String(r.reply))}</p>`
              : "";
          return `<div class="rev-item">
  <p class="stars">${starRow(r.rating)}</p>
  <p>${esc(String(r.text || ""))}</p>
  <p class="muted">${esc(String(r.customerFirstName || "Customer"))} · ${esc(String(r.productName || ""))} · ${esc(String(r.date || "").slice(0, 10))}</p>
  ${reply}
</div>`;
        })
        .join("")
    : `<p class="muted">Reviews appear here after customers order — thank you for supporting independents.</p>`;

  const similarHtml = similarStores.length
    ? `<section class="sim-sec"><h2>You might also like</h2><div class="sim-grid">${similarStores
        .map((s) => {
          const ss = publicStoreSlug(s);
          const sn = esc(s.role || "Store");
          const sc = esc(String(s.city || ""));
          const surl = `/stores/${encodeURIComponent(ss)}`;
          return `<article class="sim-card"><a href="${surl}"><div class="sim-ph"></div><h3>${sn}</h3><p class="muted">${sc}</p><span class="btn-mini">Shop now</span></a></article>`;
        })
        .join("")}</div></section>`
    : "";

  const tagLinks = [
    commLabel !== "African, Caribbean & Asian"
      ? `<a href="/community/${esc(pc || "african")}">${esc(commLabel)}</a>`
      : `<a href="/community/african">Community stores</a>`,
    city && opts.citySlug ? `<a href="/cities/${esc(opts.citySlug)}">${esc(city)}</a>` : "",
    `<a href="/categories/fresh-produce">Fresh produce</a>`,
    verified ? `<a href="/stores">Verified store</a>` : "",
    listing.deliveryEnabled !== false ? `<a href="/stores">Delivery available</a>` : "",
  ]
    .filter(Boolean)
    .slice(0, 12);

  const tagRow = tagLinks.length
    ? `<div class="tag-scroll">${tagLinks.map((t) => `<span class="tag-pill">${t}</span>`).join("")}</div>`
    : "";

  const storeJson = JSON.stringify({
    id: listingId,
    slug,
    storeOpen,
    whatsappPhone: listing.whatsappPhone || "",
    deliveryChargeGbp: Number(listing.deliveryChargeGbp) || 0,
    deliveryRadiusMiles: Number(listing.deliveryRadiusMiles) || 0,
    deliveryEnabled: listing.deliveryEnabled !== false,
    collectionEnabled: listing.collectionEnabled !== false,
    minimumOrderGbp: Number(listing.minimumOrderGbp) || 0,
    priceList: products.map((p) => ({
      item: p.item,
      price: p.priceStr,
      inStock: p.inStock,
    })),
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titleSeo}</title>
<meta name="description" content="${esc(desc.slice(0, 320))}">
<link rel="canonical" href="${pageUrl}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(name.slice(0, 90))}">
<meta property="og:description" content="${esc(desc.slice(0, 300))}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${esc(ogImage)}">
<meta name="theme-color" content="#8B3A3A">
${jsonLdScript(structured)}
<style>
:root{--terracotta:#8B3A3A;--gold:#D4A017;--cream:#F5F0E8;--brown:#2C1810;--card:#fffdf8}
*{box-sizing:border-box}
body{margin:0;font-family:"DM Sans",system-ui,sans-serif;color:var(--brown);background:var(--cream);line-height:1.45;min-height:100vh}
a{color:var(--terracotta);font-weight:600;text-underline-offset:3px}
.layout{display:grid;grid-template-columns:1fr;gap:0;max-width:1180px;margin:0 auto;padding:0 16px 140px}
@media(min-width:960px){.layout{grid-template-columns:1fr 340px;align-items:start;gap:24px;padding-bottom:48px}}
.hero-full{position:relative;min-height:min(52vh,420px);border-radius:0 0 24px 24px;overflow:hidden;background:#5c2626}
.hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.hero-fallback{position:absolute;inset:0;background:linear-gradient(135deg,#8B3A3A 0%,#5c2626 100%)}
.hero-full .veil{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(44,24,16,.4) 0%,rgba(44,24,16,.78) 100%)}
.hero-inner{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:28px 20px 36px;display:flex;align-items:flex-end;min-height:min(52vh,420px)}
.hero-card{background:rgba(255,253,248,.94);border-radius:18px;padding:20px 22px;max-width:560px;box-shadow:0 12px 40px rgba(44,24,16,.18);border:1px solid rgba(139,58,58,.2)}
.hero-card h1{font-family:"Playfair Display",Georgia,serif;font-size:clamp(1.5rem,4vw,2rem);margin:0 0 8px;color:var(--terracotta);line-height:1.15}
.badge-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 12px;font-size:.88rem}
.chip{display:inline-flex;align-items:center;gap:4px;background:var(--cream);border:1px solid rgba(139,58,58,.25);padding:4px 10px;border-radius:999px;font-size:.78rem;font-weight:600}
.chip.ver{background:rgba(212,160,23,.2);border-color:var(--gold);color:var(--brown)}
.open-badge.ok{color:#15803d;font-weight:700}
.open-badge.no{color:#b91c1c;font-weight:700}
.rating-line{font-size:.95rem}
.trust-bar{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;padding:14px 16px;background:var(--card);border-bottom:1px solid rgba(139,58,58,.12);font-size:.88rem;font-weight:600}
.trust-bar span{opacity:.95}
.cta-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.btn-pr{background:var(--terracotta);color:#fff;border:none;padding:12px 20px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem}
.btn-pr:hover{filter:brightness(1.05)}
.btn-sec{background:transparent;color:var(--terracotta);border:2px solid var(--terracotta);padding:10px 18px;border-radius:12px;font-weight:700;cursor:pointer;font-size:1rem;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.closed-strip{background:#7f1d1d;color:#fff;text-align:center;padding:12px;font-weight:600}
.desc-card{background:var(--card);border-radius:16px;padding:18px 20px;margin:20px 0;border:1px solid rgba(139,58,58,.15)}
.desc-card p{margin:0;white-space:pre-wrap}
.read-tog{background:none;border:none;color:var(--terracotta);font-weight:700;cursor:pointer;padding:8px 0;font-size:.95rem}
.ful-bar{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0;padding:14px;background:var(--card);border-radius:14px;border:1px solid rgba(139,58,58,.15)}
.ful-opt{flex:1;min-width:140px;border:2px solid rgba(139,58,58,.2);border-radius:12px;padding:12px;cursor:pointer;background:#fff;text-align:left;font:inherit}
.ful-opt.on{border-color:var(--terracotta);background:rgba(139,58,58,.06)}
.ful-opt strong{display:block;color:var(--terracotta)}
.sticky-fil{position:sticky;top:0;z-index:30;background:var(--cream);padding:10px 0 12px;border-bottom:1px solid rgba(139,58,58,.12);margin:0 -4px 14px}
.fil-scroll{display:flex;gap:8px;overflow-x:auto;padding:4px 2px;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.fil-pill{flex-shrink:0;border:1px solid rgba(139,58,58,.3);background:#fff;border-radius:999px;padding:8px 14px;font-size:.82rem;font-weight:600;cursor:pointer;color:var(--brown)}
.fil-pill.on{background:var(--terracotta);color:#fff;border-color:var(--terracotta)}
h2{font-family:"Playfair Display",Georgia,serif;color:var(--terracotta);font-size:1.35rem;margin:24px 0 12px}
.pop-sec h2{margin-top:8px}
.pgrid{display:grid;gap:14px;grid-template-columns:1fr}
@media(min-width:600px){.pgrid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:900px){.pgrid.main{grid-template-columns:repeat(3,1fr)}}
.pcard{background:var(--card);border-radius:14px;padding:12px;border:1px solid rgba(139,58,58,.12);position:relative;display:flex;flex-direction:column}
.pcard.oos{opacity:.92}
.pimg-wrap{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;background:#ede6dc}
.pimg{width:100%;height:100%;object-fit:cover;display:block}
.pholder{width:100%;height:100%;background:linear-gradient(135deg,#e8dfd4,#ddd2c4)}
.pname{font-size:1rem;margin:10px 0 4px;line-height:1.25}
.pprice{font-weight:800;color:var(--terracotta);margin:0 0 6px;font-size:1.1rem}
.pdesc{font-size:.86rem;color:#5c4033;margin:0 0 10px;min-height:2.4em;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.oos-badge{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.65);color:#fff;font-size:.72rem;padding:4px 8px;border-radius:6px;z-index:2}
.urg{position:absolute;top:10px;right:10px;font-size:.72rem;font-weight:700;z-index:2;padding:4px 8px;border-radius:6px}
.urg.hot{background:rgba(212,160,23,.95);color:var(--brown)}
.urg.low{background:rgba(185,28,28,.9);color:#fff}
.pimg.dim{filter:grayscale(.4) brightness(.92)}
.btn-add{width:100%;background:var(--terracotta);color:#fff;border:none;padding:11px;border-radius:10px;font-weight:700;cursor:pointer;font-size:.95rem}
.btn-add:disabled{opacity:.45;cursor:not-allowed}
.add-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%}
.qty{display:flex;align-items:center;gap:6px;border:2px solid var(--terracotta);border-radius:10px;padding:4px 8px;background:#fff}
.qty.hidden,.added.hidden{display:none!important}
.qbtn{width:32px;height:32px;border:none;background:var(--cream);border-radius:8px;font-size:1.1rem;cursor:pointer;font-weight:700;color:var(--terracotta)}
.qv{min-width:24px;text-align:center;font-weight:700}
.added{font-size:.82rem;color:#15803d;font-weight:700}
.basket-panel{background:var(--card);border:1px solid rgba(139,58,58,.2);border-radius:16px;padding:16px;position:sticky;top:16px}
.basket-panel h3{margin:0 0 12px;font-family:"Playfair Display",Georgia,serif;color:var(--terracotta);font-size:1.15rem}
.bline{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(139,58,58,.1);font-size:.88rem}
.bline img{width:48px;height:48px;object-fit:cover;border-radius:8px;background:#ede6dc}
.basket-empty{text-align:center;padding:24px 12px;color:#5c4033;font-size:.95rem}
.mob-dock{display:none;position:fixed;left:0;right:0;bottom:0;z-index:100;background:linear-gradient(180deg,#fffdf8,var(--cream));border-top:2px solid var(--gold);padding:10px 14px 16px;box-shadow:0 -8px 28px rgba(44,24,16,.12)}
@media(max-width:959px){.mob-dock{display:block}.desk-basket{display:none}}
.mob-dock-inner{max-width:1180px;margin:0 auto;display:flex;gap:10px;align-items:center;justify-content:space-between}
.mob-dock .btn-pr{flex:1;text-align:center;padding:14px;border-radius:12px;text-decoration:none}
.checkout-steps{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}
.checkout-steps i{font-style:normal;font-size:.72rem;background:var(--cream);padding:4px 8px;border-radius:6px;font-weight:600}
.checkout-steps i.on{background:var(--terracotta);color:#fff}
dialog{border:none;border-radius:18px;padding:0;max-width:min(480px,calc(100% - 24px));width:100%;background:var(--card);color:var(--brown);box-shadow:0 20px 60px rgba(0,0,0,.25)}
dialog::backdrop{background:rgba(44,24,16,.5)}
.dlg-h{background:var(--terracotta);color:#fff;padding:16px 18px;font-family:"Playfair Display",Georgia,serif;font-size:1.2rem}
.dlg-b{padding:16px 18px 20px;max-height:min(70vh,560px);overflow-y:auto}
.dlg-b label{display:block;font-size:.78rem;font-weight:600;margin-bottom:4px;color:#5c4033}
.dlg-b input,.dlg-b textarea{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(139,58,58,.35);font:inherit;margin-bottom:10px}
.dlg-b .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.err{color:#b91c1c;font-size:.88rem;min-height:1.2em;margin-top:6px}
.rev-sum{display:grid;gap:16px;margin-bottom:16px}
@media(min-width:600px){.rev-sum{grid-template-columns:120px 1fr 1fr;align-items:start}}
.rev-big{font-size:2.5rem;font-weight:800;color:var(--terracotta);font-family:"Playfair Display",serif}
.bars{font-size:.82rem}
.bar-row{display:flex;align-items:center;gap:8px;margin:4px 0}
.bar-row .bar{flex:1;height:8px;background:#ede6dc;border-radius:4px;overflow:hidden}
.bar-row .bar i{display:block;height:100%;background:var(--gold)}
.gold-rev{background:linear-gradient(135deg,rgba(212,160,23,.25),rgba(212,160,23,.08));border:1px solid rgba(212,160,23,.5);border-radius:14px;padding:16px;margin-bottom:16px}
.rev-item{border-bottom:1px solid rgba(139,58,58,.15);padding:14px 0}
.rev-item .stars{letter-spacing:2px;color:var(--gold);margin:0 0 6px}
.reply{margin-top:10px;padding:10px;background:rgba(139,58,58,.06);border-radius:8px;font-size:.9rem}
.sim-grid{display:grid;gap:12px;grid-template-columns:1fr}
@media(min-width:520px){.sim-grid{grid-template-columns:repeat(3,1fr)}}
.sim-card a{text-decoration:none;color:inherit;display:block;background:var(--card);border-radius:12px;padding:12px;border:1px solid rgba(139,58,58,.12);height:100%}
.sim-ph{aspect-ratio:4/3;background:linear-gradient(135deg,#e8dfd4,#d4c4b0);border-radius:8px;margin-bottom:8px}
.sim-card h3{margin:8px 0 4px;font-size:1rem}
.btn-mini{display:inline-block;margin-top:8px;font-size:.82rem;font-weight:700;color:var(--terracotta)}
.tag-scroll{display:flex;gap:8px;overflow-x:auto;padding:12px 0 24px;scrollbar-width:thin}
.tag-pill{flex-shrink:0}
.tag-pill a{white-space:nowrap;display:inline-block;padding:6px 12px;background:#fff;border:1px solid rgba(139,58,58,.2);border-radius:999px;font-size:.82rem;text-decoration:none}
.ft-banner{background:linear-gradient(90deg,rgba(212,160,23,.2),rgba(139,58,58,.12));border:1px solid rgba(139,58,58,.2);border-radius:12px;padding:12px 14px;margin:12px 0;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.9rem}
.ft-banner button{border:none;background:transparent;font-weight:700;cursor:pointer;color:var(--terracotta)}
.muted{color:#5c4033}
.small{font-size:.85rem}
.nav-top{padding:12px 16px;font-size:.9rem;max-width:1180px;margin:0 auto}
#main-col{min-width:0}
.hidden{display:none!important}
.btn-add.hidden{display:none!important}
.qty.hidden,.added.hidden{display:none!important}
</style>
</head>
<body>
<p class="nav-top"><a href="/">← Marketplace</a> · <a href="/stores">All stores</a></p>
${closedBanner}
<div class="hero-full">
  ${heroImgTag}
  <div class="veil"></div>
  <div class="hero-inner">
    <div class="hero-card">
      <h1>${esc(name)}</h1>
      <div class="badge-row">
        <span class="chip">${city ? `${esc(city)} · ` : ""}${esc(commLabel)}</span>
        ${verified ? `<span class="chip ver">✓ Verified</span>` : ""}
        ${openBadge}
      </div>
      <div class="rating-line">${ratingBlock}</div>
      <p class="muted" style="margin:8px 0 0;font-size:.9rem"><strong>Opening</strong> — ${esc(hours)}</p>
      <div class="cta-row">
        <button type="button" class="btn-pr" id="cta-catalogue">Add items to basket</button>
        ${waStoreUrl ? `<a class="btn-sec" href="${esc(waStoreUrl)}" target="_blank" rel="noopener">Message store</a>` : `<span class="muted" style="align-self:center;font-size:.88rem">WhatsApp not listed</span>`}
      </div>
    </div>
  </div>
</div>
<div class="trust-bar">
  <span>🔒 Secure payments via Stripe</span>
  <span>🚚 Local delivery where offered</span>
  <span>🏪 Collection available</span>
</div>
<div id="ft-ban" class="ft-banner" style="display:none">
  <span>Supporting independent African, Caribbean &amp; Asian businesses across the UK 🌍</span>
  <button type="button" id="ft-dismiss" aria-label="Dismiss">✕</button>
</div>
<div class="layout">
  <div id="main-col">
    ${
      bio
        ? `<div class="desc-card">
  <div id="desc-short">${descShort}</div>
  <div id="desc-full" class="hidden" style="display:none">${descFull}</div>
  ${bio.length > 220 ? `<button type="button" class="read-tog" id="read-more">Read more</button>` : ""}
</div>`
        : ""
    }
    <div class="ful-bar" role="group" aria-label="Fulfilment">
      <button type="button" class="ful-opt on" data-ful="collection" id="ful-col">
        <strong>🏪 Collection</strong>
        <span class="muted small">Ready in ~2 hours</span>
      </button>
      <button type="button" class="ful-opt" data-ful="delivery" id="ful-del" ${listing.deliveryEnabled === false ? "disabled" : ""}>
        <strong>🚚 Delivery</strong>
        <span class="muted small">£${(Number(listing.deliveryChargeGbp) || 0).toFixed(2)} · within ${Number(listing.deliveryRadiusMiles) || 5} mi</span>
      </button>
    </div>
    ${popularHtml}
    <section id="catalogue-section">
      <h2 id="shop-h">Shop</h2>
      <div class="sticky-fil">
        <div class="fil-scroll" id="fil-bar">${filterPills}</div>
      </div>
      ${mainGrid}
    </section>
    <section>
      <h2>Reviews</h2>
      ${reviewsSummary}
      ${goldReview}
      <div class="desc-card">${reviewsList}</div>
    </section>
    ${similarHtml}
    ${tagRow}
  </div>
  <aside class="desk-basket">
    <div class="basket-panel" id="side-basket">
      <h3>Your basket</h3>
      <div id="basket-lines"></div>
      <div id="basket-empty" class="basket-empty">Start adding items from this store.</div>
      <div id="basket-totals" class="hidden" style="display:none">
        <p class="muted" id="sub-line"></p>
        <p class="muted" id="del-line"></p>
        <p><strong id="grand-line"></strong></p>
        <p class="muted small" id="min-line" style="display:none"></p>
        <button type="button" class="btn-pr" style="width:100%;margin-top:10px" id="open-checkout-desk">Proceed to checkout</button>
      </div>
    </div>
  </aside>
</div>
<div class="mob-dock">
  <div class="mob-dock-inner">
    <span id="mob-sum" class="muted" style="font-size:.88rem">Basket (0) — £0.00</span>
    <a href="#" class="btn-pr" id="open-checkout-mob">View basket</a>
  </div>
</div>
<dialog id="chk">
  <form method="dialog" id="chk-form" novalidate>
    <div class="dlg-h">Checkout</div>
    <div class="dlg-b">
      <div class="checkout-steps" id="steps">
        <i class="on" data-s="1">1 Review</i>
        <i data-s="2">2 Fulfilment</i>
        <i data-s="3">3 Your details</i>
        <i data-s="4">4 Pay</i>
      </div>
      <div id="step-1">
        <div id="dlg-review"></div>
      </div>
      <div id="step-2" class="hidden" style="display:none">
        <p class="muted" id="ful-summary"></p>
        <div id="addr-box" class="hidden" style="display:none">
          <label>Address line 1</label>
          <input type="text" id="addr1" autocomplete="street-address" />
          <div class="row2">
            <div><label>City</label><input type="text" id="addr-city" autocomplete="address-level2" /></div>
            <div><label>Postcode</label><input type="text" id="addr-pc" autocomplete="postal-code" /></div>
          </div>
        </div>
      </div>
      <div id="step-3" class="hidden" style="display:none">
        <div class="row2">
          <div><label>First name</label><input type="text" id="fn" required autocomplete="given-name" /></div>
          <div><label>Last name</label><input type="text" id="ln" required autocomplete="family-name" /></div>
        </div>
        <label>Email</label>
        <input type="email" id="em" required autocomplete="email" />
        <label>WhatsApp / mobile</label>
        <input type="tel" id="ph" required autocomplete="tel" />
        <label><input type="checkbox" id="consent" required /> I agree to the <a href="/terms.html" target="_blank" rel="noopener">terms</a> and processing of my data for this order.</label>
      </div>
      <div id="step-4" class="hidden" style="display:none">
        <p>You’ll complete payment securely on Stripe (card, Apple Pay, Google Pay where available).</p>
        <p><strong id="pay-amt"></strong></p>
      </div>
      <div class="err" id="pay-err"></div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button type="button" class="btn-sec" id="chk-back" style="display:none">Back</button>
        <button type="button" class="btn-pr" id="chk-next">Continue</button>
        <button type="submit" class="btn-pr hidden" id="chk-pay" style="display:none">Pay securely</button>
      </div>
    </div>
  </form>
</dialog>
<script type="application/json" id="store-json">${storeJson}</script>
<script>
(function(){
  var STORE = JSON.parse(document.getElementById("store-json").textContent);
  var CART_KEY = "clipCart:" + STORE.id;
  var step = 1;
  function getCart(){ try { return JSON.parse(localStorage.getItem(CART_KEY) || "{}"); } catch(e){ return {}; } }
  function setCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); }
  function countItems(c){ var n = 0; for (var k in c) n += (c[k]|0); return n; }
  function parsePrice(i){ var r = STORE.priceList[i]; if (!r) return 0; return parseFloat(String(r.price||"").replace(/[^0-9.]/g,""))||0; }
  function subtotal(){ var c=getCart(), s=0; for (var k in c){ var q=c[k]|0; if(q<1)continue; s+=parsePrice(k|0)*q;} return Math.round(s*100)/100; }
  function deliveryFee(){ var el=document.querySelector(".ful-opt.on"); return el&&el.getAttribute("data-ful")==="delivery" ? (Number(STORE.deliveryChargeGbp)||0) : 0; }
  function platformFee(s){ return Math.round(s*0.15*100)/100; }
  function total(){ var s=subtotal(); var d=deliveryFee(); return Math.round((s+d+platformFee(s))*100)/100; }
  var fulfil = "collection";

  function track(ev, idx){
    fetch("/api/store-analytics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({listingId:STORE.id,event:ev,productIdx:idx})}).catch(function(){});
  }
  track("view");

  if (!sessionStorage.getItem("clip_ft_dismiss")){
    var fb=document.getElementById("ft-ban");
    if(fb){ fb.style.display="flex"; document.getElementById("ft-dismiss").onclick=function(){ sessionStorage.setItem("clip_ft_dismiss","1"); fb.style.display="none"; }; }
  }

  fetch("/api/track-visit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:location.pathname,ref:document.referrer||""})}).catch(function(){});

  document.getElementById("cta-catalogue").onclick=function(){ document.getElementById("shop-h").scrollIntoView({behavior:"smooth"}); };

  function setFul(f){
    fulfil=f;
    var col=document.getElementById("ful-col"), del=document.getElementById("ful-del");
    if(f==="delivery"){ col.classList.remove("on"); del.classList.add("on"); }
    else { del.classList.remove("on"); col.classList.add("on"); }
    renderBasket();
  }
  document.getElementById("ful-col").onclick=function(){ if(STORE.collectionEnabled===false)return; setFul("collection"); };
  document.getElementById("ful-del").onclick=function(){ if(STORE.deliveryEnabled===false)return; setFul("delivery"); };
  if (STORE.collectionEnabled===false) setFul("delivery");
  else setFul("collection");

  var pills=document.querySelectorAll(".fil-pill");
  pills.forEach(function(p){
    p.onclick=function(){
      var f=p.getAttribute("data-filter");
      pills.forEach(function(x){ x.classList.toggle("on", x.getAttribute("data-filter")===f); });
      document.querySelectorAll(".pcard").forEach(function(card){
        var c=card.getAttribute("data-cat");
        var show=f==="all"||c===f;
        card.style.display=show?"":"none";
      });
    };
  });

  var rm=document.getElementById("read-more");
  if(rm){ rm.onclick=function(){
    var s=document.getElementById("desc-short"), fu=document.getElementById("desc-full");
    if(fu.style.display==="none"){ fu.style.display="block"; s.style.display="none"; rm.textContent="Read less"; }
    else { fu.style.display="none"; s.style.display="block"; rm.textContent="Read more"; }
  }; }

  function flashAdded(idx){
    var el=document.querySelector("[data-added=\""+idx+"\"]");
    if(!el)return;
    el.classList.remove("hidden");
    setTimeout(function(){ el.classList.add("hidden"); },1400);
  }

  function renderBasket(){
    var c=getCart();
    var lines=document.getElementById("basket-lines");
    var empty=document.getElementById("basket-empty");
    var tot=document.getElementById("basket-totals");
    lines.innerHTML="";
    var n=countItems(c);
    var s=subtotal();
    var d=deliveryFee();
    var pf=platformFee(s);
    var t=Math.round((s+d+pf)*100)/100;
    if(n<1){ empty.style.display="block"; tot.style.display="none"; document.getElementById("mob-sum").textContent="Basket (0) — £0.00"; return; }
    empty.style.display="none"; tot.style.display="block";
    for(var k in c){
      var q=c[k]|0; if(q<1)continue;
      var i=k|0;
      var row=STORE.priceList[i]; if(!row)continue;
      var img=document.querySelector(".pcard[data-idx=\""+i+"\"] .pimg");
      var src=img&&img.getAttribute("src")?img.getAttribute("src"):"";
      var div=document.createElement("div"); div.className="bline";
      div.innerHTML=(src?"<img src=\""+src.replace(/"/g,"&quot;")+"\" alt=\"\"/>":"<div style=\"width:48px;height:48px;background:#ede6dc;border-radius:8px\"></div>")+
        "<div style=\"flex:1\"><strong>"+String(row.item).replace(/</g,"&lt;")+"</strong><br/>£"+parsePrice(i).toFixed(2)+" × "+q+"</div>"+
        "<div><button type=\"button\" data-bdec=\""+i+"\">−</button> <button type=\"button\" data-binc=\""+i+"\">+</button></div>";
      lines.appendChild(div);
    }
    document.getElementById("sub-line").textContent="Subtotal £"+s.toFixed(2);
    document.getElementById("del-line").textContent=d>0 ? ("Delivery £"+d.toFixed(2)) : "No delivery fee";
    document.getElementById("grand-line").textContent="Total £"+t.toFixed(2)+" (incl. service charge)";
    var mob=document.getElementById("mob-sum");
    mob.textContent="Basket ("+n+") — £"+t.toFixed(2);
    var min=Number(STORE.minimumOrderGbp)||0;
    var ml=document.getElementById("min-line");
    if(min>0 && s<min){ ml.style.display="block"; ml.textContent="Minimum order £"+min.toFixed(2)+" for this store."; }
    else { ml.style.display="none"; }
    lines.querySelectorAll("[data-bdec]").forEach(function(b){
      b.onclick=function(){ var ix=b.getAttribute("data-bdec"); var cc=getCart(); cc[ix]=(cc[ix]|0)-1; if(cc[ix]<1)delete cc[ix]; setCart(cc); syncQtyUI(); renderBasket(); };
    });
    lines.querySelectorAll("[data-binc]").forEach(function(b){
      b.onclick=function(){ var ix=b.getAttribute("data-binc"); var cc=getCart(); cc[ix]=(cc[ix]|0)+1; setCart(cc); syncQtyUI(); renderBasket(); };
    });
  }

  function syncQtyUI(){
    var c=getCart();
    document.querySelectorAll(".add-row").forEach(function(row){
      var ix=row.getAttribute("data-add-wrap");
      var q=c[ix]|0;
      var btn=row.querySelector("[data-add]");
      var qr=row.querySelector("[data-qty-row]");
      var qn=row.querySelector("[data-qty]");
      if(q>0){ btn.classList.add("hidden"); qr.classList.remove("hidden"); if(qn)qn.textContent=String(q); }
      else { btn.classList.remove("hidden"); qr.classList.add("hidden"); }
    });
  }

  document.getElementById("catalogue-section").addEventListener("click",function(ev){
    var t=ev.target;
    if(!STORE.storeOpen)return;
    if(t.getAttribute("data-add")!=null){
      var ix=t.getAttribute("data-add")|0;
      var row=STORE.priceList[ix]; if(!row||row.inStock===false)return;
      var c=getCart(); c[ix]=(c[ix]|0)+1; setCart(c);
      track("add_basket", ix);
      syncQtyUI(); renderBasket(); flashAdded(ix);
      return;
    }
    if(t.getAttribute("data-inc")!=null){
      var i2=t.getAttribute("data-inc")|0;
      var c2=getCart(); c2[i2]=(c2[i2]|0)+1; setCart(c2); syncQtyUI(); renderBasket(); return;
    }
    if(t.getAttribute("data-dec")!=null){
      var i3=t.getAttribute("data-dec")|0;
      var c3=getCart(); c3[i3]=(c3[i3]|0)-1; if(c3[i3]<1)delete c3[i3]; setCart(c3); syncQtyUI(); renderBasket(); return;
    }
  });

  syncQtyUI(); renderBasket();

  var dlg=document.getElementById("chk");
  function goStep(s){
    step=s;
    for(var i=1;i<=4;i++){
      var p=document.getElementById("step-"+i);
      if(p) p.style.display=i===s?"block":"none";
      var si=document.querySelector("#steps i[data-s=\""+i+"\"]");
      if(si) si.classList.toggle("on", i===s);
    }
    document.getElementById("chk-back").style.display=s>1?"inline-block":"none";
    document.getElementById("chk-next").style.display=s<4?"inline-block":"none";
    document.getElementById("chk-pay").style.display=s===4?"inline-block":"none";
    if(s===4){ document.getElementById("pay-amt").textContent="Pay £"+total().toFixed(2)+" securely on Stripe"; }
  }

  function openChk(){
    if(!STORE.storeOpen){ alert("This store is closed for orders."); return; }
    var s=subtotal();
    var min=Number(STORE.minimumOrderGbp)||0;
    if(min>0 && s<min){ alert("Minimum order is £"+min.toFixed(2)); return; }
    track("checkout_start");
    var c=getCart(), lines=[];
    for(var k in c){ var q=c[k]|0; if(q<1)continue; var row=STORE.priceList[k|0]; if(row) lines.push(q+"× "+row.item); }
    document.getElementById("dlg-review").innerHTML="<p>"+lines.join("<br/>")+"</p><p><strong>Total £"+total().toFixed(2)+"</strong></p>";
    document.getElementById("ful-summary").textContent=fulfil==="delivery"?"Delivery":"Collection";
    document.getElementById("addr-box").style.display=fulfil==="delivery"?"block":"none";
    document.getElementById("pay-err").textContent="";
    goStep(1);
    dlg.showModal();
  }
  document.getElementById("open-checkout-desk").onclick=openChk;
  document.getElementById("open-checkout-mob").onclick=function(ev){ ev.preventDefault(); openChk(); };

  document.getElementById("chk-next").onclick=function(){
    document.getElementById("pay-err").textContent="";
    if(step===1){ goStep(2); return; }
    if(step===2){
      if(fulfil==="delivery"){
        var a=document.getElementById("addr1").value.trim(), c=document.getElementById("addr-city").value.trim(), p=document.getElementById("addr-pc").value.trim();
        if(!a||!c||!p){ document.getElementById("pay-err").textContent="Enter your delivery address."; return; }
      }
      goStep(3); return;
    }
    if(step===3){
      var fn=document.getElementById("fn").value.trim(), ln=document.getElementById("ln").value.trim(), em=document.getElementById("em").value.trim(), ph=document.getElementById("ph").value.trim(), cs=document.getElementById("consent").checked;
      if(!fn||!ln||!em||!ph||!cs){ document.getElementById("pay-err").textContent="Fill all fields and accept terms."; return; }
      goStep(4); return;
    }
  };
  document.getElementById("chk-back").onclick=function(){ if(step>1) goStep(step-1); };

  document.getElementById("chk-form").onsubmit=function(ev){
    ev.preventDefault();
    var c=getCart(), cartLines=[];
    for(var k in c){ var q=c[k]|0; if(q<1)continue; cartLines.push({idx:k|0,qty:q}); }
    var body={
      listingId:STORE.id,
      cartLines:cartLines,
      firstName:document.getElementById("fn").value.trim(),
      lastName:document.getElementById("ln").value.trim(),
      email:document.getElementById("em").value.trim(),
      phone:document.getElementById("ph").value.trim(),
      consent:document.getElementById("consent").checked,
      fulfillment:fulfil
    };
    if(fulfil==="delivery"){
      body.deliveryAddress={
        line1:document.getElementById("addr1").value.trim(),
        city:document.getElementById("addr-city").value.trim(),
        postcode:document.getElementById("addr-pc").value.trim()
      };
    }
    var btn=document.getElementById("chk-pay"); btn.disabled=true;
    fetch("/api/stripe-checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data.url){ window.location.href=data.url; return; }
        document.getElementById("pay-err").textContent=data.error||"Payment could not start.";
        btn.disabled=false;
      }).catch(function(){ document.getElementById("pay-err").textContent="Network error."; btn.disabled=false; });
  };

  document.getElementById("chk-pay").onclick=function(){ document.getElementById("chk-form").requestSubmit(); };

  goStep(1);
})();
</script>
</body>
</html>`;
}
