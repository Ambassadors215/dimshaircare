import { getProviders } from "../../lib/kv-store.js";

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  const token = req.headers["x-admin-token"];
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || token !== expected) return endJson(res, 401, { ok: false, error: "Unauthorized" });

  try {
    const providers = await getProviders();
    return endJson(res, 200, { ok: true, providers });
  } catch (e) {
    console.error("ADMIN_PROVIDERS_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to load providers" });
  }
}
