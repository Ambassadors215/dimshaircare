import {
  isProviderOtpInCooldown,
  setProviderOtp,
  setProviderOtpCooldown,
  verifyAndConsumeProviderOtp,
} from "../lib/kv-store.js";
import { sendEmail, isEmailConfigured } from "../lib/email.js";
import { PROVIDER_SESSION_COOKIE, signProviderSession } from "../lib/provider-session.js";

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

function randomOtp6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function setSessionCookie(res, token) {
  const parts = [
    `${PROVIDER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000",
  ];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  const parts = [`${PROVIDER_SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }
  res.setHeader("Set-Cookie", parts.join("; "));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 16) {
    return endJson(res, 503, {
      ok: false,
      error: "Provider sign-in is not configured. Set SESSION_SECRET (16+ chars) on the server.",
    });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const action = String(payload?.action || "").trim();

  if (action === "logout") {
    clearSessionCookie(res);
    return endJson(res, 200, { ok: true });
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return endJson(res, 400, { ok: false, error: "Valid provider email required" });
  }

  if (action === "request-otp") {
    if (!isEmailConfigured()) {
      return endJson(res, 503, { ok: false, error: "Email is not configured on the server; cannot send codes." });
    }
    if (await isProviderOtpInCooldown(email)) {
      return endJson(res, 429, { ok: false, error: "Please wait about a minute before requesting another code." });
    }
    const code = randomOtp6();
    await setProviderOtp(email, code);
    await setProviderOtpCooldown(email, 45);
    const html = `<p>Your Clip Services provider sign-in code is:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:0.2em;font-family:ui-monospace,monospace">${code}</p>
<p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p>
<p>— Clip Services</p>`;
    try {
      await sendEmail({
        to: email,
        subject: "Your Clip Services provider sign-in code",
        html,
      });
    } catch (e) {
      console.error("OTP_EMAIL_ERR", e?.message);
      return endJson(res, 500, { ok: false, error: "Could not send email. Try again later." });
    }
    return endJson(res, 200, { ok: true, sent: true });
  }

  if (action === "verify-otp") {
    const code = String(payload?.code || "").replace(/\D/g, "");
    if (code.length !== 6) {
      return endJson(res, 400, { ok: false, error: "Enter the 6-digit code from your email." });
    }
    const ok = await verifyAndConsumeProviderOtp(email, code);
    if (!ok) {
      return endJson(res, 401, { ok: false, error: "Invalid or expired code. Request a new one." });
    }
    const token = signProviderSession(email);
    if (!token) {
      return endJson(res, 500, { ok: false, error: "Could not create session." });
    }
    setSessionCookie(res, token);
    return endJson(res, 200, { ok: true, email });
  }

  return endJson(res, 400, { ok: false, error: "Unknown action" });
}
