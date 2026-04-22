import { recordSearchEvent } from "../kv-store.js";

function endJson(res, code, obj) {
  res.statusCode = code;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return endJson(res, 405, { ok: false, error: "Method Not Allowed" });
  }
  let payload = {};
  try {
    const b = await new Promise((resolve, reject) => {
      const chunks = [];
      let n = 0;
      req.on("data", (c) => {
        n += c.length;
        if (n > 8192) {
          reject(new Error("too large"));
          req.destroy();
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
    payload = JSON.parse(b || "{}");
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const event = String(payload?.event || "").trim();
  const q = String(payload?.q || "").trim().slice(0, 120);

  try {
    await recordSearchEvent(event, q);
  } catch (e) {
    console.error("SEARCH_EVENT", e);
  }

  return endJson(res, 200, { ok: true });
}
