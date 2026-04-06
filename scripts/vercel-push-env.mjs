#!/usr/bin/env node
/**
 * Push environment variables from .env / .env.local to Vercel (Production + Preview).
 *
 * Prerequisites:
 *   1. Vercel token: https://vercel.com/account/tokens → export VERCEL_TOKEN=...
 *   2. Link project once: npx vercel link   (creates .vercel/project.json)
 *      OR set VERCEL_PROJECT_ID (project id) and VERCEL_TEAM_ID (org/team id, same as orgId in project.json)
 *   3. Fill .env.local with the same values you want on Vercel.
 *
 * Run:  npm run vercel:env:push
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Keys we manage (must match what the app reads). */
const KEYS = [
  "KV_REDIS_URL",
  "SESSION_SECRET",
  "ADMIN_TOKEN",
  "SITE_URL",
  "KV_PREFIX",
  "BREVO_SMTP_USER",
  "BREVO_SMTP_KEY",
  "BREVO_SMTP_PORT",
  "BREVO_SMTP_HOST",
  "EMAIL_FROM",
  "ADMIN_EMAIL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PUBLISHABLE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_CONTACT_EMAIL",
];

function loadDotEnv(name, override) {
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
    if (override || process.env[k] === undefined || process.env[k] === "") {
      process.env[k] = v;
    }
  }
}

async function main() {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error("Missing VERCEL_TOKEN. Create one: https://vercel.com/account/tokens");
    console.error("Then: set VERCEL_TOKEN=... (PowerShell: $env:VERCEL_TOKEN='...')");
    process.exit(1);
  }

  loadDotEnv(".env", false);
  loadDotEnv(".env.local", true);

  let projectId = process.env.VERCEL_PROJECT_ID?.trim();
  let teamId = process.env.VERCEL_TEAM_ID?.trim();

  const projFile = resolve(root, ".vercel/project.json");
  if (existsSync(projFile)) {
    const meta = JSON.parse(readFileSync(projFile, "utf8"));
    projectId = projectId || meta.projectId;
    teamId = teamId || meta.orgId;
  }

  if (!projectId) {
    projectId = process.env.VERCEL_PROJECT_NAME?.trim() || "clips-service";
    console.warn(`No .vercel/project.json — using project idOrName: ${projectId}`);
  }

  const qs = new URLSearchParams({ upsert: "true" });
  if (teamId) qs.set("teamId", teamId);

  const url = `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env?${qs}`;
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const key of KEYS) {
    const value = process.env[key];
    if (value === undefined || String(value).trim() === "") {
      console.warn(`skip (empty): ${key}`);
      skip++;
      continue;
    }

    const body = {
      key,
      value: String(value),
      type: "encrypted",
      target: ["production", "preview"],
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error(`FAIL ${key} HTTP ${res.status}:`, txt.slice(0, 400));
      fail++;
    } else {
      console.log(`OK ${key}`);
      ok++;
    }
  }

  console.log(`\nDone: ${ok} set, ${skip} skipped (empty), ${fail} failed.`);
  if (fail > 0) process.exit(1);
  console.log("Redeploy on Vercel (or wait for git deploy) so new env applies.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
