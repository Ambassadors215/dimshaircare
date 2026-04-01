import { addContact } from "../lib/kv-store.js";
import { notifyProviderApplicationAdmin, notifyProviderApplicationApplicant } from "../lib/notify.js";
import { sendEmail, adminInbox, isEmailConfigured } from "../lib/email.js";

function readBody(req, limitBytes = 4 * 1024 * 1024) {
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

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function safeText(s, max = 5000) {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, max);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function endJson(res, statusCode, obj) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(obj));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return endJson(res, 405, { ok: false, error: "Method Not Allowed" });

  let payload;
  try {
    const raw = await readBody(req);
    payload = JSON.parse(raw);
  } catch {
    return endJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const name = safeText(payload?.name, 120);
  const email = safeText(payload?.email, 120);
  const message = safeText(payload?.message, 8000);
  const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];

  if (!name) return endJson(res, 400, { ok: false, error: "Missing name" });
  if (!isValidEmail(email)) return endJson(res, 400, { ok: false, error: "Invalid email" });
  if (!message) return endJson(res, 400, { ok: false, error: "Missing message" });

  const createdAt = new Date().toISOString();
  const record = { createdAt, name, email, message };

  try {
    await addContact(record);
    const isProviderApp = message.includes("[PROVIDER APPLICATION]");
    if (isProviderApp) {
      void Promise.allSettled([
        notifyProviderApplicationApplicant(name, email.trim()),
        notifyProviderApplicationAdmin(record),
      ]);

      if (isEmailConfigured() && attachments.length > 0) {
        const emailAttachments = attachments
          .filter((a) => a?.data && a?.name)
          .slice(0, 3)
          .map((a) => ({
            filename: a.name,
            content: a.data,
            encoding: "base64",
            contentType: a.type || "image/jpeg",
          }));

        if (emailAttachments.length > 0) {
          const kycLines = message.split("\n").filter((l) => l.includes(":")).map((l) => { const safe = escapeHtml(l); return `<li>${safe.replace(":", ":</strong>").replace(/^/, "<strong>")}</li>`; }).join("");
          void sendEmail({
            to: adminInbox(),
            subject: `[Clip Services] KYC Documents — ${name}`,
            html: `<h3>Provider KYC Documents</h3><ul>${kycLines}</ul><p>${emailAttachments.length} document(s) attached.</p>`,
            attachments: emailAttachments,
          }).catch((e) => console.error("KYC_EMAIL_ERROR", e));
        }
      }
    }
    return endJson(res, 200, { ok: true });
  } catch (e) {
    console.error("CONTACT_KV_ERROR", e);
    return endJson(res, 500, { ok: false, error: "Failed to save message" });
  }
}
