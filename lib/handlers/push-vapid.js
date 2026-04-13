function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "GET") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return endJson(res, 200, { ok: false, configured: false });
  return endJson(res, 200, { ok: true, configured: true, publicKey: key });
}
