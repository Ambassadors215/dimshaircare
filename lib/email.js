import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  const user = process.env.BREVO_SMTP_USER?.trim();
  const pass = process.env.BREVO_SMTP_KEY?.trim();
  if (!user || !pass) return null;
  if (!transporter) {
    const port = Number(process.env.BREVO_SMTP_PORT) || 587;
    const secure = port === 465;
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST?.trim() || "smtp-relay.brevo.com",
      port,
      secure,
      requireTLS: !secure,
      auth: { user, pass },
      connectionTimeout: 25_000,
      greetingTimeout: 15_000,
      socketTimeout: 25_000,
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      pool: false,
    });
  }
  return transporter;
}

export function isEmailConfigured() {
  return Boolean(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_KEY && process.env.EMAIL_FROM);
}

/**
 * @param {{ to: string; subject: string; html: string; text?: string }} opts
 */
export async function sendEmail(opts) {
  const tx = getTransporter();
  if (!tx) {
    console.warn("EMAIL_SKIP: Brevo SMTP not configured");
    return { skipped: true };
  }
  const from = (process.env.EMAIL_FROM || "Clip Services <clipservices26@gmail.com>").trim();
  const replyTo = (process.env.EMAIL_REPLY_TO || process.env.ADMIN_EMAIL || "").trim();
  const mailOpts = {
    from,
    to: typeof opts.to === "string" ? opts.to.trim() : opts.to,
    subject: opts.subject,
    text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html: opts.html,
  };
  if (opts.attachments && Array.isArray(opts.attachments)) {
    mailOpts.attachments = opts.attachments;
  }
  if (replyTo && replyTo.includes("@")) {
    mailOpts.replyTo = replyTo;
  }
  await tx.sendMail(mailOpts);
  return { sent: true };
}

export function adminInbox() {
  return (process.env.ADMIN_EMAIL || "clipservices26@gmail.com").trim();
}
