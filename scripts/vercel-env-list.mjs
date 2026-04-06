#!/usr/bin/env node
/**
 * List Vercel project env var NAMES (values never printed).
 * Loads VERCEL_TOKEN from .env.local / .env (same rules as vercel-push-env).
 *
 * Run: npm run vercel:env:ls
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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
  loadDotEnv(".env", false);
  loadDotEnv(".env.local", true);

  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    console.error("No VERCEL_TOKEN in environment or .env.local");
    process.exit(1);
  }

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
    console.warn("Using project idOrName:", projectId, "(set .vercel/project.json via npx vercel link)\n");
  }

  const qs = new URLSearchParams({ decrypt: "false" });
  if (teamId) qs.set("teamId", teamId);

  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}/env?${qs}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) {
    console.error("API error HTTP", res.status);
    console.error(text.slice(0, 800));
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("Invalid JSON from Vercel");
    process.exit(1);
  }

  const envs = data.envs || [];
  if (!envs.length) {
    console.log("No environment variables returned (empty project or no access).");
    process.exit(0);
  }

  const byKey = new Map();
  for (const e of envs) {
    const key = e.key;
    const targets = Array.isArray(e.target) ? e.target.join(",") : String(e.target || "");
    const prev = byKey.get(key) || new Set();
    targets.split(",").forEach((t) => prev.add(t.trim()));
    byKey.set(key, prev);
  }

  const sorted = [...byKey.keys()].sort();
  console.log(`Project: ${projectId}\nVariables (${sorted.length}) — values hidden:\n`);
  for (const k of sorted) {
    const t = [...byKey.get(k)].filter(Boolean).join(", ") || "(target?)";
    console.log(`  • ${k}  [${t}]`);
  }

  const required = [
    "KV_REDIS_URL",
    "SITE_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SESSION_SECRET",
    "ADMIN_TOKEN",
  ];
  console.log("\nQuick check (name only):");
  for (const r of required) {
    console.log(`  ${byKey.has(r) ? "✓" : "✗"} ${r}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
