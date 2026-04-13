import crypto from "node:crypto";
import { appendSiteVisit } from "../kv-store.js";

function readBody(req, limitBytes = 16 * 1024) {
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

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) return xff.split(",")[0].trim().slice(0, 45);
  const xri = req.headers["x-real-ip"];
  if (typeof xri === "string" && xri.trim()) return xri.trim().slice(0, 45);
  const xv = req.headers["x-vercel-forwarded-for"];
  if (typeof xv === "string" && xv.trim()) return xv.split(",")[0].trim().slice(0, 45);
  return "";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("access-control-allow-methods", "POST, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    res.setHeader("access-control-max-age", "86400");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw || "{}");
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const path = String(payload?.path || "/").replace(/\0/g, "").slice(0, 500);
  const ref = String(payload?.ref || "").replace(/\0/g, "").slice(0, 500);
  const href = String(payload?.href || "").replace(/\0/g, "").slice(0, 500);
  const ip = clientIp(req);
  const ua = String(req.headers["user-agent"] || "").slice(0, 200);
  const country = String(req.headers["x-vercel-ip-country"] || "")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 8);
  const salt = String(process.env.SESSION_SECRET || "site-vis").slice(0, 32);
  const visitor = crypto.createHash("sha256").update(`${ip}|${ua}|${salt}`).digest("hex").slice(0, 20);

  try {
    await appendSiteVisit({
      ts: new Date().toISOString(),
      path,
      ref: ref || undefined,
      href: href || undefined,
      country: country || undefined,
      visitor,
    });
  } catch (e) {
    console.error("TRACK_VISIT", e?.message || e);
    return endJson(res, 503, { ok: false, error: "Storage unavailable" });
  }

  return endJson(res, 200, { ok: true });
}
