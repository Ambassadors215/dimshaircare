import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_KEY;
  if (!user || !pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: { user, pass },
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
  const from = process.env.EMAIL_FROM || "Clip Services <clipservices26@gmail.com>";
  const mailOpts = {
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text || opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    html: opts.html,
  };
  if (opts.attachments && Array.isArray(opts.attachments)) {
    mailOpts.attachments = opts.attachments;
  }
  await tx.sendMail(mailOpts);
  return { sent: true };
}

export function adminInbox() {
  return (process.env.ADMIN_EMAIL || "clipservices26@gmail.com").trim();
}
