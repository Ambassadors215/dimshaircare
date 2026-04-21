import { incrementOnboardingMetric } from "../kv-store.js";

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
        if (n > 65536) {
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
  const allowed = new Set(["view_store_apply", "view_stall_apply"]);
  if (!allowed.has(event)) {
    return endJson(res, 400, { ok: false, error: "Unknown event" });
  }

  try {
    if (event === "view_store_apply") await incrementOnboardingMetric("viewsStoreApply");
    if (event === "view_stall_apply") await incrementOnboardingMetric("viewsStallApply");
  } catch (e) {
    console.error("ONBOARDING_TRACK", e);
  }

  return endJson(res, 200, { ok: true });
}
