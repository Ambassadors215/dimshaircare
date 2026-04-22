#!/usr/bin/env node
/**
 * Print Vercel project Git link status (no secrets). Loads .env.local like other scripts.
 * Run: node scripts/vercel-git-status.mjs
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

async function getProject(token, teamId, name) {
  const qs = new URLSearchParams();
  if (teamId) qs.set("teamId", teamId);
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}?${qs}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 400) };
  return { ok: true, status: res.status, json: JSON.parse(text) };
}

async function main() {
  loadDotEnv(".env", false);
  loadDotEnv(".env.local", true);

  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!token) {
    console.error("No VERCEL_TOKEN in .env.local");
    process.exit(1);
  }

  const projects = ["clips-service", "dimshaircare"];
  for (const name of projects) {
    const r = await getProject(token, teamId, name);
    console.log(`\n--- ${name} HTTP ${r.status}`);
    if (!r.ok) {
      console.log(r.body);
      continue;
    }
    const j = r.json;
    console.log("id:", j.id);
    console.log("link:", JSON.stringify(j.link || null, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
