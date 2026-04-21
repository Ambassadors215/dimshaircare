import Stripe from "stripe";
import { getProviderSessionEmailFromReq } from "../provider-session.js";
import {
  getMarketplaceListings,
  upsertMarketplaceListing,
  getBookings,
  patchBooking,
  getNegotiationsByEmail,
  getProvider,
  getBookingByRef,
  getRecentSiteVisits,
} from "../kv-store.js";
import { publicStoreSlug } from "../seo-html.js";
import { siteUrl } from "../site-url.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

async function readJson(req) {
  const b = req.body;
  try {
    if (b != null && typeof b === "object" && !Buffer.isBuffer(b)) return b;
    if (typeof b === "string" && b.trim()) return JSON.parse(b);
  } catch {
    return null;
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > 4 * 1024 * 1024) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        resolve(null);
      }
    });
    req.on("error", reject);
  });
}

function safeEmail(e) {
  const s = String(e || "")
    .trim()
    .toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
}

function listingForEmail(listings, email) {
  const e = safeEmail(email);
  return listings.filter((x) => String(x?.email || "").toLowerCase() === e);
}

function sanitizeListing(l) {
  if (!l) return null;
  const copy = { ...l };
  if (copy.storePhotoData && copy.storePhotoData.length > 120) {
    copy.storePhotoData = copy.storePhotoData.slice(0, 800000);
  }
  if (Array.isArray(copy.storeProducts)) {
    copy.storeProducts = copy.storeProducts.map((p) => ({
      ...p,
      photoData: p.photoData ? String(p.photoData).slice(0, 480000) : "",
    }));
  }
  return copy;
}

function ordersForListing(bookings, listingId) {
  const id = String(listingId);
  return bookings.filter(
    (b) => b?.marketplaceOrder && String(b.listingId || b.providerId) === id
  );
}

function deriveStage(b) {
  if (b.storeStage && ["new", "confirmed", "ready", "completed"].includes(b.storeStage)) {
    return b.storeStage;
  }
  const st = String(b.status || "");
  if (st === "awaiting_payment" || st === "new") return "new";
  if (st === "paid" || st === "confirmed") return "confirmed";
  if (st === "completed") return "completed";
  return "new";
}

async function stripeRevenueSummary(listingId) {
  const out = {
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    thisWeekGbp: 0,
    thisMonthGbp: 0,
    allTimeGbp: 0,
    avgOrderGbp: 0,
    weekVsPrevPct: null,
    monthVsPrevPct: null,
    ordersPerDay: [],
    revenuePerWeek: [],
    chartError: null,
  };
  if (!process.env.STRIPE_SECRET_KEY) return out;
  let prov;
  try {
    prov = await getProvider(String(listingId));
  } catch {
    return out;
  }
  if (!prov?.stripeAccountId || !prov?.onboarded) {
    out.chartError = "Connect Stripe in Settings to see live revenue.";
    return out;
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const now = Date.now();
  const dayMs = 86400000;
  try {
    const txs = await stripe.balanceTransactions.list(
      { limit: 100, created: { gte: Math.floor((now - 90 * dayMs) / 1000) } },
      { stripeAccount: prov.stripeAccountId }
    );
    let week = 0;
    let prevWeek = 0;
    let month = 0;
    let prevMonth = 0;
    const weekStart = now - 7 * dayMs;
    const prevWeekStart = now - 14 * dayMs;
    const monthStart = now - 30 * dayMs;
    const prevMonthStart = now - 60 * dayMs;
    const orderAmounts = [];
    for (const tx of txs.data) {
      if (tx.type !== "charge" && tx.type !== "payment") continue;
      const amt = (tx.amount || 0) / 100;
      if (amt <= 0) continue;
      const t = tx.created * 1000;
      orderAmounts.push({ t, amt });
      if (t >= weekStart) week += amt;
      else if (t >= prevWeekStart && t < weekStart) prevWeek += amt;
      if (t >= monthStart) month += amt;
      else if (t >= prevMonthStart && t < monthStart) prevMonth += amt;
    }
    out.thisWeekGbp = Math.round(week * 100) / 100;
    out.thisMonthGbp = Math.round(month * 100) / 100;
    out.allTimeGbp = Math.round(orderAmounts.reduce((s, x) => s + x.amt, 0) * 100) / 100;
    const n = orderAmounts.length;
    out.avgOrderGbp = n ? Math.round((out.allTimeGbp / n) * 100) / 100 : 0;
    if (prevWeek > 0) out.weekVsPrevPct = Math.round(((week - prevWeek) / prevWeek) * 1000) / 10;
    if (prevMonth > 0) out.monthVsPrevPct = Math.round(((month - prevMonth) / prevMonth) * 1000) / 10;
    const perDay = {};
    for (let d = 0; d < 30; d++) {
      const day = new Date(now - (29 - d) * dayMs);
      const key = day.toISOString().slice(0, 10);
      perDay[key] = 0;
    }
    for (const { t, amt } of orderAmounts) {
      if (t < now - 30 * dayMs) continue;
      const key = new Date(t).toISOString().slice(0, 10);
      if (perDay[key] !== undefined) perDay[key] += amt;
    }
    out.ordersPerDay = Object.entries(perDay).map(([date, total]) => ({ date, count: 0, total }));
    let wk = 0;
    const wmap = {};
    for (const { t, amt } of orderAmounts) {
      if (t < now - 84 * dayMs) continue;
      const w = Math.floor((now - t) / (7 * dayMs));
      wmap[w] = (wmap[w] || 0) + amt;
    }
    out.revenuePerWeek = Object.entries(wmap)
      .map(([w, total]) => ({ week: `W-${w}`, total }))
      .slice(0, 12);
  } catch (e) {
    console.error("STORE_OWNER_STRIPE", e?.message);
    out.chartError = "Could not load Stripe data.";
  }
  return out;
}

function insightsFromData(orders, visits30, avgRating, products, reviewsArr) {
  const out = [];
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const o of orders) {
    if (new Date(o.createdAt || 0).getTime() < Date.now() - 30 * 86400000) continue;
    counts[new Date(o.createdAt || 0).getDay()]++;
  }
  const maxI = counts.indexOf(Math.max(...counts));
  if (orders.length) out.push(`Your busiest order day is ${dow[maxI]}.`);
  const top = (products || []).find((p) => p.featured) || (products || [])[0];
  if (top?.name) out.push(`${top.name} is highlighted in your catalogue — keep photos fresh.`);
  if (avgRating >= 4 && reviewsArr?.length) out.push(`Customers rate you ${avgRating.toFixed(1)}/5 on average.`);
  if (visits30 > 0 && orders.length === 0) out.push("Your store page is getting views — share checkout links to turn views into orders.");
  return out.slice(0, 6);
}

async function buildSnapshot(email, listingIdIn) {
  const listings = await getMarketplaceListings();
  const mine = listingForEmail(listings, email);
  let listing =
    (listingIdIn && mine.find((x) => String(x.id) === String(listingIdIn))) || mine[0] || null;
  if (!listing) {
    return { ok: false, code: "NO_LISTING", error: "No store listing for this email." };
  }
  const bookings = await getBookings();
  const orders = ordersForListing(bookings, listing.id).map((b) => ({
    ref: b.ref,
    customerName: `${b.firstName || ""} ${b.lastName || ""}`.trim(),
    phone: b.phone || "",
    email: b.email || "",
    itemsLine: String(b.notes || "")
      .split("\n")[0]
      .slice(0, 200),
    totalGbp: b.totalGBP ?? null,
    subtotalGBP: b.subtotalGBP ?? null,
    fulfillment: b.fulfillment || b.date || "",
    status: b.status,
    storeStage: deriveStage(b),
    createdAt: b.createdAt,
    paidAt: b.paidAt,
  }));
  const negs = await getNegotiationsByEmail(email);
  const providerNegs = negs.filter((n) => String(n.providerEmail).toLowerCase() === email);
  const slug = publicStoreSlug(listing);
  const base = siteUrl().replace(/\/$/, "");
  const storeUrl = `${base}/stores/${encodeURIComponent(slug)}`;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => String(o.createdAt || "").slice(0, 10) === today).length;
  const weekStart = Date.now() - 7 * 86400000;
  const weekRev = orders
    .filter((o) => new Date(o.createdAt || 0).getTime() >= weekStart && o.subtotalGBP)
    .reduce((s, o) => s + Number(o.subtotalGBP || 0), 0);
  const reviews = Array.isArray(listing.reviews) ? listing.reviews : [];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
      : 0;
  const products = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
  let pageViews7d = 0;
  let pageViews30d = 0;
  const viewsLine = [];
  const productViewCounts = {};
  try {
    const visits = await getRecentSiteVisits(2500);
    const slugPath = `/stores/${slug}`;
    const idPath = `/store/${encodeURIComponent(String(listing.id))}`;
    const now = Date.now();
    const dayBuckets = {};
    for (let d = 0; d < 30; d++) {
      const dt = new Date(now - (29 - d) * 86400000).toISOString().slice(0, 10);
      dayBuckets[dt] = 0;
    }
    for (const v of visits) {
      const p = String(v.path || "");
      if (!p.includes(slugPath) && !p.startsWith(idPath)) continue;
      const t = new Date(v.ts || v.createdAt || 0).getTime();
      if (t < now - 30 * 86400000) continue;
      const day = new Date(t).toISOString().slice(0, 10);
      if (dayBuckets[day] !== undefined) dayBuckets[day]++;
      if (t >= now - 7 * 86400000) pageViews7d++;
      pageViews30d++;
      const pm = p.match(/\/p\/(\d+)\//);
      if (pm) {
        const idx = pm[1];
        productViewCounts[idx] = (productViewCounts[idx] || 0) + 1;
      }
    }
    viewsLine.push(...Object.entries(dayBuckets).map(([date, count]) => ({ date, count })));
  } catch (e) {
    console.warn("STORE_OWNER_VISITS", e?.message);
  }
  const topProductIdx = Object.entries(productViewCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topProductsByViews = topProductIdx.map(([idx, views]) => {
    const i = Number(idx);
    const name = listing.priceList?.[i]?.item || products[i]?.name || `Product ${idx}`;
    return { name, views };
  });
  const orders30 = orders.filter((o) => new Date(o.createdAt || 0).getTime() >= Date.now() - 30 * 86400000);
  const conversionPct =
    pageViews30d > 0 ? Math.round((orders30.length / pageViews30d) * 10000) / 100 : 0;
  const dowOrder = [0, 0, 0, 0, 0, 0, 0];
  for (const o of orders) {
    dowOrder[new Date(o.createdAt || 0).getDay()]++;
  }
  const nowMs = Date.now();
  const orderDayBuckets = {};
  for (let d = 0; d < 30; d++) {
    const dt = new Date(nowMs - (29 - d) * 86400000).toISOString().slice(0, 10);
    orderDayBuckets[dt] = 0;
  }
  for (const o of orders) {
    const dt = String(o.createdAt || "").slice(0, 10);
    if (orderDayBuckets[dt] !== undefined) orderDayBuckets[dt]++;
  }
  const ordersPerDay = Object.entries(orderDayBuckets).map(([date, count]) => ({ date, count }));
  const checklist = {
    productsOk: products.length >= 3,
    photoOk: Boolean(listing.storePhotoData && listing.storePhotoData.length > 100),
    hoursOk: Boolean(listing.openingHours && String(listing.openingHours).length > 5),
    stripeOk: Boolean((await getProvider(String(listing.id)))?.onboarded),
  };
  const checklistPct = [checklist.productsOk, checklist.photoOk, checklist.hoursOk, checklist.stripeOk].filter(
    Boolean
  ).length;
  const stripeSummary = await stripeRevenueSummary(listing.id);
  const insights = insightsFromData(orders, pageViews30d, avgRating, products, reviews);
  let stripeProvider = null;
  try {
    const sp = await getProvider(String(listing.id));
    if (sp) {
      stripeProvider = {
        onboarded: Boolean(sp.onboarded),
        stripeAccountId: sp.stripeAccountId || null,
      };
    }
  } catch {
    stripeProvider = null;
  }
  return {
    ok: true,
    listing: sanitizeListing(listing),
    listingId: listing.id,
    storeUrl,
    slug,
    stripeProvider,
    orders,
    negotiations: providerNegs,
    metrics: {
      todayOrders,
      weekRevenueGbp: Math.round(weekRev * 100) / 100,
      totalOrders: orders.length,
      avgRating: Math.round(avgRating * 10) / 10,
      pageViews7d,
      pageViews30d,
    },
    analytics: {
      viewsLine,
      topProductsByViews,
      ordersByDow: dowOrder,
      ordersPerDay,
      conversionPct,
      insights,
    },
    checklist,
    checklistComplete: checklistPct >= 4,
    checklistPct: Math.round((checklistPct / 4) * 100),
    stripe: stripeSummary,
    reviews,
  };
}

export default async function handler(req, res) {
  const email = getProviderSessionEmailFromReq(req);
  if (!email) {
    return endJson(res, 401, { ok: false, code: "PROVIDER_AUTH", error: "Store owner sign-in required" });
  }

  if (req.method === "GET") {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host}`);
      const listingId = url.searchParams.get("listingId");
      const snap = await buildSnapshot(email, listingId);
      if (!snap.ok) return endJson(res, 404, snap);
      return endJson(res, 200, snap);
    } catch (e) {
      console.error("STORE_OWNER_GET", e);
      return endJson(res, 500, { ok: false, error: "Failed to load store dashboard" });
    }
  }

  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    payload = await readJson(req);
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid body" });
  }
  if (!payload || typeof payload !== "object") {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const action = String(payload.action || "").trim();
  const listings = await getMarketplaceListings();
  const mine = listingForEmail(listings, email);
  let listing =
    mine.find((x) => String(x.id) === String(payload.listingId)) || mine[0] || null;
  if (!listing && action !== "noop") {
    return endJson(res, 404, { ok: false, error: "No store listing" });
  }

  try {
    if (action === "set-open") {
      const open = payload.open !== false;
      await upsertMarketplaceListing({ id: listing.id, email: listing.email, role: listing.role, storeOpen: open });
      return endJson(res, 200, { ok: true });
    }
    if (action === "save-profile") {
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: String(payload.storeName || listing.role).slice(0, 200),
        bio: String(payload.bio ?? listing.bio).slice(0, 4000),
        city: String(payload.city ?? listing.city ?? "").slice(0, 120),
        whatsappPhone: String(payload.whatsappPhone ?? listing.whatsappPhone ?? "").slice(0, 40),
        openingHours: payload.openingHours != null ? payload.openingHours : listing.openingHours,
        deliveryEnabled: Boolean(payload.deliveryEnabled),
        collectionEnabled: payload.collectionEnabled !== false,
        deliveryRadiusMiles: Number(payload.deliveryRadiusMiles) || 0,
        deliveryChargeGbp: Number(payload.deliveryChargeGbp) || 0,
        storePhotoData: typeof payload.storePhotoData === "string" ? payload.storePhotoData : listing.storePhotoData,
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "save-products") {
      const products = Array.isArray(payload.products) ? payload.products : [];
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        storeProducts: products,
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "delete-product") {
      const pid = String(payload.productId || "");
      const cur = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        storeProducts: cur.filter((p) => String(p.id) !== pid),
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "bulk-stock") {
      const ids = new Set((Array.isArray(payload.productIds) ? payload.productIds : []).map(String));
      const cur = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
      const inStock = payload.inStock !== false;
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        storeProducts: cur.map((p) => (ids.has(String(p.id)) ? { ...p, inStock } : p)),
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "bulk-delete-products") {
      const ids = new Set((Array.isArray(payload.productIds) ? payload.productIds : []).map(String));
      const cur = Array.isArray(listing.storeProducts) ? listing.storeProducts : [];
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        storeProducts: cur.filter((p) => !ids.has(String(p.id))),
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "set-order-stage") {
      const ref = String(payload.ref || "");
      const stage = String(payload.storeStage || "").toLowerCase();
      if (!ref || !["new", "confirmed", "ready", "completed"].includes(stage)) {
        return endJson(res, 400, { ok: false, error: "Invalid order or stage" });
      }
      const b = await getBookingByRef(ref);
      if (!b?.marketplaceOrder || String(b.listingId) !== String(listing.id)) {
        return endJson(res, 403, { ok: false, error: "Order not found" });
      }
      await patchBooking(ref, { storeStage: stage });
      let whatsappUrl = "";
      if (stage === "ready" && b.phone) {
        const storeName = listing.role || "our store";
        const cust = `${b.firstName || ""}`.trim() || "there";
        const msg = `Hi ${cust} 👋 Your order from ${storeName} is ready for collection. Thank you for supporting local businesses 🙌🏾`;
        const digits = String(b.phone).replace(/\D/g, "");
        if (digits.length >= 10) {
          whatsappUrl = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
        }
      }
      return endJson(res, 200, { ok: true, whatsappUrl });
    }
    if (action === "save-review-reply") {
      const reviewId = String(payload.reviewId || "");
      const reply = String(payload.reply || "").slice(0, 2000);
      const revs = Array.isArray(listing.reviews) ? [...listing.reviews] : [];
      const i = revs.findIndex((r) => String(r.id) === reviewId);
      if (i < 0) return endJson(res, 404, { ok: false, error: "Review not found" });
      revs[i] = { ...revs[i], reply, replyAt: new Date().toISOString() };
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        reviews: revs,
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "save-promotions") {
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        promotionOptIns: payload.optIns && typeof payload.optIns === "object" ? payload.optIns : {},
      });
      return endJson(res, 200, { ok: true });
    }
    if (action === "save-notification-prefs") {
      await upsertMarketplaceListing({
        id: listing.id,
        email: listing.email,
        role: listing.role,
        notificationPrefs: payload.prefs && typeof payload.prefs === "object" ? payload.prefs : {},
      });
      return endJson(res, 200, { ok: true });
    }
    return endJson(res, 400, { ok: false, error: "Unknown action" });
  } catch (e) {
    console.error("STORE_OWNER_POST", e);
    return endJson(res, 500, { ok: false, error: e.message || "Failed" });
  }
}
