#!/usr/bin/env node
/**
 * Checks which environment variables are set (values never printed).
 * Run: npm run verify-env
 * Load .env.local first if present (for local dev only).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @param {{ override?: boolean }} [opts] */
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

function ok(name, predicate, hint) {
  const pass = predicate();
  const icon = pass ? "✓" : "✗";
  console.log(`${icon} ${name}${!pass && hint ? ` — ${hint}` : ""}`);
  return pass;
}

const has = (k) => Boolean(process.env[k] && String(process.env[k]).trim());

console.log("\nClip Services — environment check (no secret values shown)\n");

let critical = 0;
let total = 0;

total++;
if (!ok("KV_REDIS_URL", () => has("KV_REDIS_URL"), "Upstash/Vercel Redis — required for bookings, negotiations, OTP, push subs")) critical++;

total++;
if (!ok("SESSION_SECRET (16+ chars)", () => has("SESSION_SECRET") && process.env.SESSION_SECRET.length >= 16, "openssl rand -hex 32 OR npm run gen:secret")) critical++;

total++;
if (!ok("ADMIN_TOKEN", () => has("ADMIN_TOKEN"), "Random string — admin dashboard + push-subscribe admin role")) critical++;

total++;
ok("SITE_URL", () => has("SITE_URL"), "Your production URL (Stripe redirects, email links). Default used if unset.");

total++;
ok("BREVO_SMTP_USER + BREVO_SMTP_KEY + EMAIL_FROM", () => has("BREVO_SMTP_USER") && has("BREVO_SMTP_KEY") && has("EMAIL_FROM"), "Required to send provider OTP codes and booking emails");

total++;
ok("ADMIN_EMAIL", () => has("ADMIN_EMAIL"), "Optional — defaults to clipservices26@gmail.com in code");

total++;
ok("STRIPE_SECRET_KEY", () => has("STRIPE_SECRET_KEY"), "Optional — card checkout disabled if missing");

total++;
ok("STRIPE_WEBHOOK_SECRET", () => has("STRIPE_WEBHOOK_SECRET"), "Optional — needed with Stripe webhooks for paid status");

total++;
ok("VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY", () => has("VAPID_PUBLIC_KEY") && has("VAPID_PRIVATE_KEY"), "Optional — PWA push disabled if missing");

console.log(`\n${critical === 0 ? "All critical variables OK." : `Missing ${critical} critical variable(s) — fix before production.`}\n`);

process.exit(critical > 0 ? 1 : 0);
