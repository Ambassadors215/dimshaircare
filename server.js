import http from "node:http";
import fs from "node:fs/promises";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

function loadDotEnvFile(name, opts) {
  const p = path.join(ROOT, name);
  if (!existsSync(p)) return;
  const raw = readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (opts?.override || process.env[k] === undefined || process.env[k] === "") {
      process.env[k] = v;
    }
  }
}

loadDotEnvFile(".env");
loadDotEnvFile(".env.local", { override: true });

let stripeCheckoutFn;
let dashboardFn;
let negotiateFn;
let trackVisitFn;

async function runTrackVisit(req, res) {
  trackVisitFn ??= (await import("./lib/handlers/track-visit.js")).default;
  return trackVisitFn(req, res);
}

async function runStripeCheckout(req, res) {
  stripeCheckoutFn ??= (await import("./lib/handlers/stripe-checkout.js")).default;
  return stripeCheckoutFn(req, res);
}

async function runDashboard(req, res) {
  dashboardFn ??= (await import("./lib/handlers/dashboard.js")).default;
  return dashboardFn(req, res);
}

async function runNegotiate(req, res) {
  negotiateFn ??= (await import("./lib/handlers/negotiate.js")).default;
  return negotiateFn(req, res);
}
const DATA_DIR = path.join(ROOT, "data");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const CONTACT_FILE = path.join(DATA_DIR, "contact-messages.json");

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".ico":
      return "image/x-icon";
    default:
      return "application/octet-stream";
  }
}

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonArray(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendJsonArray(filePath, item) {
  await ensureDataDir();
  const existing = await readJsonArray(filePath);
  existing.push(item);
  await fs.writeFile(filePath, JSON.stringify(existing, null, 2) + "\n", "utf8");
}

function readBody(req, limitBytes = 1024 * 1024) {
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

function json(res, statusCode, obj) {
  return send(
    res,
    statusCode,
    { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    JSON.stringify(obj)
  );
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function safeText(s, max = 5000) {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const apiPath = url.pathname.replace(/\/+$/, "") || "/";

    // --- API (same modules as Vercel; needs KV_REDIS_URL + STRIPE_SECRET_KEY in .env.local for pay flow)
    if (apiPath === "/api/stripe-checkout" && req.method === "POST") {
      return runStripeCheckout(req, res);
    }
    if (apiPath === "/api/dashboard" && req.method === "GET") {
      return runDashboard(req, res);
    }
    if (apiPath === "/api/negotiate" && req.method === "POST") {
      return runNegotiate(req, res);
    }
    if (apiPath === "/api/track-visit" && (req.method === "POST" || req.method === "OPTIONS")) {
      return runTrackVisit(req, res);
    }

    // --- API
    if (url.pathname === "/api/booking" && req.method === "POST") {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json(res, 400, { ok: false, error: "Invalid JSON" });
      }

      const service = safeText(payload?.service, 120);
      const price = safeText(String(payload?.price ?? ""), 20);
      const dur = safeText(payload?.dur, 60);
      const date = safeText(payload?.date, 80);
      const time = safeText(payload?.time, 40);
      const firstName = safeText(payload?.firstName, 80);
      const lastName = safeText(payload?.lastName, 80);
      const phone = safeText(payload?.phone, 40);
      const email = safeText(payload?.email, 120);
      const notes = safeText(payload?.notes, 3000);
      const consent = Boolean(payload?.consent);

      if (!service || !date || !time) return json(res, 400, { ok: false, error: "Missing service/date/time" });
      if (!firstName || !lastName) return json(res, 400, { ok: false, error: "Missing name" });
      if (!phone) return json(res, 400, { ok: false, error: "Missing phone" });
      if (!isValidEmail(email)) return json(res, 400, { ok: false, error: "Invalid email" });
      if (!consent) return json(res, 400, { ok: false, error: "Consent is required" });

      const ref = `CS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const createdAt = new Date().toISOString();
      const record = {
        ref,
        createdAt,
        service,
        price,
        dur,
        date,
        time,
        firstName,
        lastName,
        phone,
        email,
        notes
      };

      await appendJsonArray(BOOKINGS_FILE, record);
      return json(res, 200, { ok: true, ref });
    }

    if (url.pathname === "/api/contact" && req.method === "POST") {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json(res, 400, { ok: false, error: "Invalid JSON" });
      }

      const name = safeText(payload?.name, 120);
      const email = safeText(payload?.email, 120);
      const message = safeText(payload?.message, 120000);
      const phone = safeText(payload?.phone, 40);

      if (!name) return json(res, 400, { ok: false, error: "Missing name" });
      if (!isValidEmail(email)) return json(res, 400, { ok: false, error: "Invalid email" });
      if (!message) return json(res, 400, { ok: false, error: "Missing message" });

      const createdAt = new Date().toISOString();
      const record = { createdAt, name, email, message };
      if (phone) record.phone = phone;
      await appendJsonArray(CONTACT_FILE, record);
      return json(res, 200, { ok: true });
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 405, { "content-type": "text/plain; charset=utf-8" }, "Method Not Allowed");
    }

    if (url.pathname === "/index.html") {
      const loc = "/" + (url.search || "");
      return send(res, 301, { Location: loc }, undefined);
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/clip-services-marketplace" ||
      url.pathname === "/clip-services-marketplace.html"
    ) {
      const html = await fs.readFile(path.join(ROOT, "clip-services-marketplace.html"));
      return send(res, 200, { "content-type": "text/html; charset=utf-8" }, req.method === "HEAD" ? undefined : html);
    }

    const safePath = path.normalize(url.pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    const rel = safePath.replace(/^[/\\]+/, "");
    let filePath = path.join(ROOT, rel);

    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      return send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not Found");
    }
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      try {
        stat = await fs.stat(filePath);
      } catch {
        return send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not Found");
      }
    }
    if (!stat.isFile()) {
      return send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not Found");
    }

    const data = await fs.readFile(filePath);
    return send(
      res,
      200,
      {
        "content-type": contentTypeFor(filePath),
        "cache-control": "public, max-age=3600"
      },
      req.method === "HEAD" ? undefined : data
    );
  } catch {
    return send(res, 404, { "content-type": "text/plain; charset=utf-8" }, "Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
  if (!process.env.KV_REDIS_URL?.trim()) {
    console.warn(
      "[clip-services] KV_REDIS_URL is not set — /api/dashboard, /api/negotiate, /api/stripe-checkout need Redis (copy from Vercel into .env.local)."
    );
  }
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.warn("[clip-services] STRIPE_SECRET_KEY is not set — card checkout will return NO_STRIPE until configured.");
  }
});

