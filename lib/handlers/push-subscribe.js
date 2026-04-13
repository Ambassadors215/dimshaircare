import { addPushSubscription, addPushSubscriptionForEmail } from "../kv-store.js";

function readBody(req, limitBytes = 65536) {
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

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default async function handler(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const role = String(payload?.role || "").trim();
  const subscription = payload?.subscription;
  const token = String(payload?.adminToken || "").trim();
  const email = String(payload?.email || "").trim();

  try {
    if (role === "admin") {
      if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
        return endJson(res, 401, { ok: false, error: "Unauthorized" });
      }
      await addPushSubscription("admin", subscription);
      return endJson(res, 200, { ok: true });
    }

    if (role === "customer") {
      if (!isValidEmail(email)) {
        return endJson(res, 400, {
          ok: false,
          error: "Valid email required — use the same address as your customer dashboard / booking.",
        });
      }
      await addPushSubscriptionForEmail(email, "user", subscription);
      return endJson(res, 200, { ok: true });
    }

    if (role === "provider") {
      if (!isValidEmail(email)) {
        return endJson(res, 400, {
          ok: false,
          error: "Valid email required — use the same address as your published provider listing.",
        });
      }
      await addPushSubscriptionForEmail(email, "provider", subscription);
      return endJson(res, 200, { ok: true });
    }

    return endJson(res, 400, { ok: false, error: "Invalid role" });
  } catch (e) {
    console.error("PUSH_SUB_ERR", e);
    return endJson(res, 400, { ok: false, error: "Invalid subscription" });
  }
}
