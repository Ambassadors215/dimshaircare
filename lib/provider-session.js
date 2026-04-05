import crypto from "node:crypto";

export const PROVIDER_SESSION_COOKIE = "cs_prov_sess";

function sessionSecret() {
  const s = process.env.SESSION_SECRET || "";
  return s.length >= 16 ? s : "";
}

export function signProviderSession(email) {
  const secret = sessionSecret();
  if (!secret) return null;
  const e = String(email || "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = JSON.stringify({ email: e, exp });
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyProviderSession(token) {
  if (!token || typeof token !== "string") return null;
  const secret = sessionSecret();
  if (!secret) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payloadB64 = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
  if (expect !== sig || !payloadB64) return null;
  let obj;
  try {
    obj = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!obj?.email || typeof obj.exp !== "number") return null;
  if (obj.exp < Math.floor(Date.now() / 1000)) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email)) return null;
  return String(obj.email).toLowerCase();
}

export function getProviderSessionEmailFromReq(req) {
  const raw = req.headers?.cookie;
  if (!raw || typeof raw !== "string") return null;
  const cookies = Object.create(null);
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      cookies[k] = decodeURIComponent(v);
    } catch {
      cookies[k] = v;
    }
  }
  const tok = cookies[PROVIDER_SESSION_COOKIE];
  return tok ? verifyProviderSession(tok) : null;
}
