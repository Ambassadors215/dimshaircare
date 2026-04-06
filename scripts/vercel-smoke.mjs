#!/usr/bin/env node
/**
 * Hit production (or any base URL) API endpoints; expect JSON, not HTML.
 * Run: npm run vercel:smoke
 *      npm run vercel:smoke -- https://your-domain.vercel.app
 */
const base = (process.argv[2] || process.env.SITE_URL || "https://clips-service.vercel.app").replace(/\/$/, "");

async function check(path, init) {
  const url = base + path;
  const res = await fetch(url, init);
  const text = await res.text();
  const first = text.trim().charAt(0);
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* ignore */
  }
  const okJson = first === "{" || first === "[";
  return { url, status: res.status, okJson, json, snippet: text.slice(0, 120) };
}

async function main() {
  console.log("Smoke test base:", base, "\n");

  const a = await check("/api/dashboard?role=customer&email=smoke@test.local");
  console.log("GET /api/dashboard (bad email)", a.status, a.okJson ? "JSON" : "NOT_JSON", a.json?.error || a.snippet);

  const b = await check("/api/stripe-checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });
  console.log("POST /api/stripe-checkout {}", b.status, b.okJson ? "JSON" : "NOT_JSON", b.json?.error || b.json?.code || b.snippet);

  if (!a.okJson || !b.okJson) {
    console.error("\nFAIL: expected JSON bodies (got HTML or plain text). Check deployment and env.");
    process.exit(1);
  }

  console.log("\nOK: APIs return JSON.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
