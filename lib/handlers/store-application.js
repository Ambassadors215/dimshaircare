import crypto from "node:crypto";
import {
  upsertMarketplaceListing,
  addOnboardingApplication,
  incrementOnboardingMetric,
} from "../kv-store.js";
import { sendEmail, isEmailConfigured } from "../email.js";

function readBody(req, limitBytes = 6 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function safeText(s, max) {
  return typeof s === "string" ? s.trim().slice(0, max) : "";
}

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim().toLowerCase());
}

function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function genRef() {
  return `APP-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
}

const STORE_TYPES = new Set([
  "african-grocery",
  "caribbean-grocery",
  "south-asian-grocery",
  "east-asian-grocery",
  "middle-eastern-grocery",
  "african-hair-beauty",
  "asian-beauty",
  "african-fashion",
  "caribbean-fashion",
  "halal-butcher",
  "mixed-community",
  "other",
]);

const CITIES = new Set([
  "manchester",
  "london",
  "birmingham",
  "leeds",
  "leicester",
  "bradford",
  "bristol",
  "liverpool",
  "sheffield",
  "nottingham",
  "other",
]);

function mapStoreTypeToCategory(st) {
  const m = {
    "african-grocery": "groceries",
    "caribbean-grocery": "groceries",
    "south-asian-grocery": "groceries",
    "east-asian-grocery": "groceries",
    "middle-eastern-grocery": "groceries",
    "african-hair-beauty": "hair-beauty",
    "asian-beauty": "hair-beauty",
    "african-fashion": "fashion",
    "caribbean-fashion": "fashion",
    "halal-butcher": "halal",
    "mixed-community": "groceries",
    other: "groceries",
  };
  return m[st] || "groceries";
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const SONIA = (process.env.SONIA_OPS_EMAIL || "soniaotikpa@gmail.com").trim();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw);
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const flow = String(payload?.flow || "").toLowerCase();
  if (flow === "store") {
    return handleStoreFlow(req, res, payload);
  }
  if (flow === "stall") {
    return handleStallFlow(req, res, payload);
  }
  return endJson(res, 400, { ok: false, error: "Invalid flow" });
}

async function handleStoreFlow(req, res, payload) {
  const storeName = safeText(payload?.storeName, 200);
  const storeType = safeText(payload?.storeType, 80).toLowerCase();
  const city = safeText(payload?.city, 80).toLowerCase();
  const postcode = safeText(payload?.postcode, 20);
  const ownerName = safeText(payload?.ownerName, 120);
  const whatsapp = safeText(payload?.whatsapp, 40);
  const email = safeText(payload?.email, 120).toLowerCase();
  const sellCategories = Array.isArray(payload?.sellCategories) ? payload.sellCategories : [];
  const description = safeText(payload?.description, 1200);
  const fulfilment = safeText(payload?.fulfilment, 40).toLowerCase();
  const verificationBusiness = Boolean(payload?.verificationBusiness);
  const termsAccepted = Boolean(payload?.termsAccepted);
  const photo = payload?.photo && typeof payload.photo === "object" ? payload.photo : null;

  if (!storeName || !ownerName || !whatsapp || !email) {
    return endJson(res, 400, { ok: false, error: "Missing required fields" });
  }
  if (!STORE_TYPES.has(storeType)) {
    return endJson(res, 400, { ok: false, error: "Invalid store type" });
  }
  if (!CITIES.has(city)) {
    return endJson(res, 400, { ok: false, error: "Invalid city" });
  }
  if (!isValidEmail(email)) {
    return endJson(res, 400, { ok: false, error: "Invalid email" });
  }
  if (!["collection", "both"].includes(fulfilment)) {
    return endJson(res, 400, { ok: false, error: "Invalid fulfilment" });
  }
  if (!verificationBusiness || !termsAccepted) {
    return endJson(res, 400, { ok: false, error: "Confirm verification and terms" });
  }
  if (wordCount(description) > 100) {
    return endJson(res, 400, { ok: false, error: "Description must be 100 words or fewer" });
  }
  if (sellCategories.length < 1 || sellCategories.length > 20) {
    return endJson(res, 400, { ok: false, error: "Select at least one product category" });
  }

  let photoMeta = null;
  if (photo?.data && photo?.name) {
    const buf = Buffer.from(String(photo.data), "base64");
    if (buf.length > 5 * 1024 * 1024) {
      return endJson(res, 400, { ok: false, error: "Photo must be 5MB or smaller" });
    }
    photoMeta = {
      name: safeText(photo.name, 120),
      type: safeText(photo.type || "image/jpeg", 80),
      size: buf.length,
    };
  }

  const ref = genRef();
  const listingId = ref;
  const createdAt = new Date().toISOString();
  const services = sellCategories.map((s) => String(s).slice(0, 120));

  try {
    await upsertMarketplaceListing({
      id: listingId,
      email,
      role: storeName,
      bio: description || `Store in ${city}. Categories: ${services.join(", ")}.`,
      services,
      category: mapStoreTypeToCategory(storeType),
      priceList: [],
      negotiationEnabled: true,
      applicationStatus: "pending",
      applicationRef: ref,
      onboardingFlow: "store",
      city: city === "other" ? "Other" : city.charAt(0).toUpperCase() + city.slice(1),
      postcode,
      storeType,
      fulfilment,
      ownerName,
      whatsappPhone: whatsapp,
    });
  } catch (e) {
    console.error("STORE_APP_LISTING", e);
    return endJson(res, 500, { ok: false, error: "Could not save draft profile" });
  }

  const applicationRecord = {
    ref,
    flow: "store",
    createdAt,
    storeName,
    storeType,
    city,
    postcode,
    ownerName,
    whatsapp,
    email,
    sellCategories,
    description,
    fulfilment,
    photo: photoMeta,
    listingId,
  };

  try {
    await addOnboardingApplication({
      ...applicationRecord,
      photoBase64: photo?.data ? String(photo.data).slice(0, 6 * 1024 * 1024) : undefined,
    });
  } catch (e) {
    console.error("STORE_APP_LOG", e);
  }

  try {
    await incrementOnboardingMetric("submissionsStore");
  } catch (e) {
    console.warn("ONBOARDING_METRIC", e);
  }

  const html = buildEmailHtml(ref, createdAt, "Established store", applicationRecord);
  if (isEmailConfigured() && SONIA.includes("@")) {
    void sendEmail({
      to: SONIA,
      subject: `[Clip Services] New store application ${ref} — ${storeName}`,
      html,
    }).catch((e) => console.error("STORE_APP_EMAIL", e));
  }

  const waBusiness = (process.env.CLIP_WHATSAPP_E164 || "447487588706").replace(/\D/g, "");
  const msg = `Hi 👋 We've received your application to list ${storeName} on Clip Services. We'll review it and get back to you within 48 hours. Ref: ${ref}`;
  const whatsappUrl = `https://wa.me/${waBusiness}?text=${encodeURIComponent(msg)}`;

  return endJson(res, 200, {
    ok: true,
    ref,
    listingId,
    whatsappUrl,
    redirect: `/apply/confirmed/?ref=${encodeURIComponent(ref)}&name=${encodeURIComponent(ownerName)}&store=${encodeURIComponent(storeName)}&flow=store`,
  });
}

async function handleStallFlow(req, res, payload) {
  const fullName = safeText(payload?.fullName, 120);
  const whatYouSell = safeText(payload?.whatYouSell, 500);
  const city = safeText(payload?.city, 80).toLowerCase();
  const whatsapp = safeText(payload?.whatsapp, 40);
  const email = safeText(payload?.email, 120).toLowerCase();
  const marketLocation = safeText(payload?.marketLocation, 200);
  const tradeDays = Array.isArray(payload?.tradeDays) ? payload.tradeDays.map((d) => String(d).slice(0, 12)) : [];
  const delivery = safeText(payload?.delivery, 20).toLowerCase();
  const termsAccepted = Boolean(payload?.termsAccepted);
  const photo = payload?.photo && typeof payload.photo === "object" ? payload.photo : null;

  if (!fullName || !whatYouSell || !whatsapp || !email) {
    return endJson(res, 400, { ok: false, error: "Missing required fields" });
  }
  if (!CITIES.has(city)) {
    return endJson(res, 400, { ok: false, error: "Invalid city" });
  }
  if (!isValidEmail(email)) {
    return endJson(res, 400, { ok: false, error: "Invalid email" });
  }
  if (!termsAccepted) {
    return endJson(res, 400, { ok: false, error: "Accept terms to continue" });
  }

  let photoMeta = null;
  if (photo?.data && photo?.name) {
    const buf = Buffer.from(String(photo.data), "base64");
    if (buf.length > 5 * 1024 * 1024) {
      return endJson(res, 400, { ok: false, error: "Photo must be 5MB or smaller" });
    }
    photoMeta = { name: safeText(photo.name, 120), type: safeText(photo.type || "image/jpeg", 80), size: buf.length };
  }

  const ref = genRef();
  const listingId = ref;
  const createdAt = new Date().toISOString();
  const displayCity = city === "other" ? "Other" : city.charAt(0).toUpperCase() + city.slice(1);
  const stallName = `${fullName} — Market stall`;
  const bio = `${whatYouSell}${marketLocation ? ` · ${marketLocation}` : ""} · ${displayCity}.`;

  try {
    await upsertMarketplaceListing({
      id: listingId,
      email,
      role: stallName,
      bio,
      services: ["Market stall", ...tradeDays].filter(Boolean).slice(0, 20),
      category: "stall",
      priceList: [],
      negotiationEnabled: true,
      applicationStatus: "pending",
      applicationRef: ref,
      onboardingFlow: "stall",
      city: displayCity,
      postcode: "",
      storeType: "market-stall",
      fulfilment: delivery === "yes" ? "both" : "collection",
      ownerName: fullName,
      whatsappPhone: whatsapp,
    });
  } catch (e) {
    console.error("STALL_APP_LISTING", e);
    return endJson(res, 500, { ok: false, error: "Could not save draft profile" });
  }

  const applicationRecord = {
    ref,
    flow: "stall",
    createdAt,
    fullName,
    whatYouSell,
    city,
    marketLocation,
    tradeDays,
    delivery,
    whatsapp,
    email,
    photo: photoMeta,
    listingId,
  };

  try {
    await addOnboardingApplication({
      ...applicationRecord,
      photoBase64: photo?.data ? String(photo.data).slice(0, 6 * 1024 * 1024) : undefined,
    });
  } catch (e) {
    console.error("STALL_APP_LOG", e);
  }

  try {
    await incrementOnboardingMetric("submissionsStall");
  } catch (e) {
    console.warn("ONBOARDING_METRIC", e);
  }

  const html = buildEmailHtml(ref, createdAt, "Market stall", applicationRecord);
  if (isEmailConfigured() && SONIA.includes("@")) {
    void sendEmail({
      to: SONIA,
      subject: `[Clip Services] New stall application ${ref} — ${fullName}`,
      html,
    }).catch((e) => console.error("STALL_APP_EMAIL", e));
  }

  const waBusiness = (process.env.CLIP_WHATSAPP_E164 || "447487588706").replace(/\D/g, "");
  const msg = `Hi 👋 We've received your application to list your stall on Clip Services. We'll review it and get back to you within 48 hours. Ref: ${ref}`;
  const whatsappUrl = `https://wa.me/${waBusiness}?text=${encodeURIComponent(msg)}`;

  return endJson(res, 200, {
    ok: true,
    ref,
    listingId,
    whatsappUrl,
    redirect: `/apply/confirmed/?ref=${encodeURIComponent(ref)}&name=${encodeURIComponent(fullName)}&flow=stall`,
  });
}

function buildEmailHtml(ref, createdAt, label, data) {
  const rows = Object.entries(data)
    .filter(([k]) => k !== "photoBase64")
    .map(([k, v]) => `<tr><td style="padding:8px;border:1px solid #ddd"><strong>${escHtml(k)}</strong></td><td style="padding:8px;border:1px solid #ddd;white-space:pre-wrap">${escHtml(typeof v === "object" ? JSON.stringify(v) : String(v))}</td></tr>`)
    .join("");
  return `<p><strong>${escHtml(label)}</strong> — ${escHtml(ref)}</p>
<p><strong>Timestamp:</strong> ${escHtml(createdAt)}</p>
<table style="border-collapse:collapse;width:100%;max-width:720px">${rows}</table>`;
}
