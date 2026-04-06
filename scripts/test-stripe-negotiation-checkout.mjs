#!/usr/bin/env node
/**
 * Integration test: POST /api/stripe-checkout with a real agreed negotiation (Stripe test/live key + Redis).
 * Loads .env.local like verify-env. Skips with exit 0 if KV_REDIS_URL or data is missing.
 *
 * Run: npm run test:stripe-checkout
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EventEmitter } from "node:events";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadDotEnv(name, opts) {
  const p = resolve(root, name);
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

loadDotEnv(".env");
loadDotEnv(".env.local", { override: true });

function normalizeEmail(email) {
  if (typeof email !== "string") return "";
  return email
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "")
    .trim()
    .toLowerCase();
}

function mockPostReq(bodyObj) {
  const e = new EventEmitter();
  e.method = "POST";
  e.headers = { host: "localhost" };
  e.url = "/api/stripe-checkout";
  queueMicrotask(() => {
    e.emit("data", Buffer.from(JSON.stringify(bodyObj)));
    e.emit("end");
  });
  return e;
}

function mockRes() {
  return {
    statusCode: 0,
    setHeader() {},
    end(body) {
      this.raw = body;
      try {
        this.json = JSON.parse(String(body));
      } catch {
        this.json = null;
      }
    },
  };
}

async function main() {
  if (!process.env.KV_REDIS_URL?.trim()) {
    console.log("SKIP: KV_REDIS_URL not set (add Upstash/Vercel Redis to .env.local or env).");
    process.exit(0);
  }
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    console.log("SKIP: STRIPE_SECRET_KEY not set.");
    process.exit(0);
  }

  const { getNegotiations } = await import("../lib/kv-store.js");
  const handler = (await import("../api/stripe-checkout.js")).default;

  const negs = await getNegotiations();
  const agreed = negs.find(
    (n) => n.status === "agreed" && n.agreedPrice != null && n.bookingRef && n.customerEmail
  );
  if (!agreed) {
    console.log("SKIP: No negotiation with status agreed + bookingRef + customerEmail in Redis.");
    process.exit(0);
  }

  const email = normalizeEmail(agreed.customerEmail);
  const body = {
    negotiationId: String(agreed.id),
    email,
    consent: true,
  };

  const req = mockPostReq(body);
  const res = mockRes();
  await handler(req, res);

  if (!res.json) {
    console.error("FAIL: Non-JSON response:", String(res.raw || "").slice(0, 200));
    process.exit(1);
  }

  if (res.json.code === "NO_STRIPE") {
    console.error("FAIL: Stripe not configured (unexpected after env check).");
    process.exit(1);
  }

  if (!res.json.ok) {
    console.error("FAIL:", res.json.error || res.json);
    process.exit(1);
  }

  if (!res.json.url || !String(res.json.url).includes("checkout.stripe.com")) {
    console.error("FAIL: Missing Stripe checkout URL:", res.json);
    process.exit(1);
  }

  console.log("OK: Stripe Checkout session URL returned for negotiation", agreed.id);
  console.log("   (Open URL in browser only if you intend to complete/cancel a test payment.)");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
