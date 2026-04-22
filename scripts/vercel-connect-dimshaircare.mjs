#!/usr/bin/env node
/**
 * Uses Vercel CLI to connect project "dimshaircare" to GitHub Ambassadors215/Clips-Service-.
 * Requires: VERCEL_TOKEN in .env.local, npx vercel (downloaded on first run).
 *
 * Run: node scripts/vercel-connect-dimshaircare.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

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

async function getProjectMeta(token, teamId, name) {
  const qs = new URLSearchParams();
  if (teamId) qs.set("teamId", teamId);
  const url = `https://api.vercel.com/v9/projects/${encodeURIComponent(name)}?${qs}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${name}: ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function main() {
  loadDotEnv(".env", false);
  loadDotEnv(".env.local", true);

  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  if (!token) {
    console.error("Missing VERCEL_TOKEN in .env.local");
    process.exit(1);
  }

  const dim = await getProjectMeta(token, teamId, "dimshaircare");
  const orgId = dim.accountId ?? dim.teamId ?? dim.team?.id;
  if (!orgId) {
    console.error("No accountId/teamId on project; keys:", Object.keys(dim).slice(0, 30));
    process.exit(1);
  }

  const vercelDir = resolve(root, ".vercel");
  mkdirSync(vercelDir, { recursive: true });
  writeFileSync(
    resolve(vercelDir, "project.json"),
    JSON.stringify({ orgId, projectId: dim.id, projectName: dim.name }, null, 2) + "\n",
    "utf8"
  );

  const repoUrl = "https://github.com/Ambassadors215/Clips-Service-";
  console.log("Connecting dimshaircare →", repoUrl);

  const args = [
    "vercel@latest",
    "git",
    "connect",
    repoUrl,
    "--yes",
    "--token",
    token,
    ...(teamId ? ["--scope", teamId] : []),
  ];

  const r = spawnSync("npx", args, {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  console.log(r.stdout || "");
  if (r.stderr) console.error(r.stderr);
  if (r.status !== 0) {
    console.error("Exit code:", r.status);
    process.exit(r.status || 1);
  }
  console.log("Done. Verify: Vercel → dimshaircare → Settings → Git");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
