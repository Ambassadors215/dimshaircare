import { sendEmail, adminInbox, isEmailConfigured } from "./email.js";
import { notifyPushRole } from "./push.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function parallel(...tasks) {
  await Promise.allSettled(tasks);
}

/** Offline / WhatsApp booking saved */
export async function notifyBookingSubmittedCustomer(booking) {
  const html = `<p>Hi ${esc(booking.firstName)},</p>
<p>Thanks — we’ve received your booking request.</p>
<p><strong>Reference:</strong> ${esc(booking.ref)}<br/>
<strong>Service:</strong> ${esc(booking.service)}<br/>
<strong>When:</strong> ${esc(booking.date)} ${esc(booking.time)}<br/>
${booking.price ? `<strong>Payment:</strong> ${esc(booking.price)}<br/>` : ""}
</p>
<p>We’ll confirm on WhatsApp shortly.</p>
<p>— Clip Services</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: booking.email,
          subject: `Booking received — ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("customer", {
      title: "Booking received",
      body: `${booking.ref} — ${booking.service}`,
      url: "/clip-services-marketplace.html",
    })
  );
}

export async function notifyBookingSubmittedAdmin(booking) {
  const html = `<p><strong>New booking</strong> ${esc(booking.ref)}</p>
<p>${esc(booking.firstName)} ${esc(booking.lastName)} · ${esc(booking.email)} · ${esc(booking.phone)}</p>
<p>${esc(booking.service)} · ${esc(booking.date)} ${esc(booking.time)}</p>
<p>${esc(booking.price || "—")}</p>
<pre style="font-family:sans-serif;white-space:pre-wrap">${esc(booking.notes)}</pre>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: adminInbox(),
          subject: `[Clip Services] New booking ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("admin", {
      title: "New booking",
      body: `${booking.ref} · ${booking.firstName} ${booking.lastName}`,
      url: "/admin/",
    })
  );
}

/** Stripe checkout session created */
export async function notifyCheckoutStartedCustomer(booking, checkoutUrl) {
  const html = `<p>Hi ${esc(booking.firstName)},</p>
<p>Complete your secure card payment to confirm booking <strong>${esc(booking.ref)}</strong>.</p>
<p><a href="${esc(checkoutUrl)}">Pay now with Stripe</a></p>
<p>If the button doesn’t work, copy this link:<br/>${esc(checkoutUrl)}</p>
<p>— Clip Services</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: booking.email,
          subject: `Complete payment — ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("customer", {
      title: "Complete payment",
      body: `Tap to pay for ${booking.ref}`,
      url: checkoutUrl,
    })
  );
}

export async function notifyCheckoutStartedAdmin(booking) {
  const html = `<p><strong>Awaiting payment</strong> ${esc(booking.ref)}</p>
<p>${esc(booking.firstName)} ${esc(booking.lastName)} · ${esc(booking.email)}</p>
<p>${esc(booking.service)} · £${esc(booking.totalGBP)} total</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: adminInbox(),
          subject: `[Clip Services] Awaiting payment ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("admin", {
      title: "Awaiting payment",
      body: booking.ref,
      url: "/admin/",
    })
  );
}

export async function notifyPaymentSucceededCustomer(booking) {
  const html = `<p>Hi ${esc(booking.firstName)},</p>
<p><strong>Payment received</strong> for booking <strong>${esc(booking.ref)}</strong>.</p>
<p>We’ll WhatsApp you to confirm the time and details.</p>
<p>— Clip Services</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: booking.email,
          subject: `Payment confirmed — ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("customer", {
      title: "Payment confirmed",
      body: `${booking.ref} — we’ll confirm on WhatsApp`,
      url: "/clip-services-marketplace.html",
    })
  );
}

export async function notifyPaymentSucceededAdmin(booking) {
  const html = `<p><strong>Paid</strong> ${esc(booking.ref)}</p>
<p>${esc(booking.firstName)} ${esc(booking.lastName)} · ${esc(booking.email)}</p>
<p>${esc(booking.service)} · ${esc(booking.price || "")}</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: adminInbox(),
          subject: `[Clip Services] Paid ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("admin", {
      title: "Booking paid",
      body: booking.ref,
      url: "/admin/",
    })
  );
}

export async function notifyProviderApplicationApplicant(name, email) {
  const html = `<p>Hi ${esc(name.split(" ")[0] || "there")},</p>
<p>We’ve received your Clip Services provider application.</p>
<p>We’ll review it and WhatsApp you within 48 hours.</p>
<p>— Clip Services</p>`;
  if (isEmailConfigured()) {
    await sendEmail({
      to: email,
      subject: "Provider application received — Clip Services",
      html,
    }).catch((e) => console.error("EMAIL_APP_APPLICANT", e));
  }
}

export async function notifyProviderApplicationAdmin(record) {
  const phoneLine = record.phone ? `<p><strong>WhatsApp / phone:</strong> ${esc(record.phone)}</p>` : "";
  const html = `<p><strong>New provider application</strong></p>
<p>${esc(record.name)} · <a href="mailto:${esc(record.email)}">${esc(record.email)}</a></p>
${phoneLine}
<p style="color:#555;font-size:13px">Full details are below and in your admin dashboard → <strong>Applications</strong> tab → <strong>Refresh</strong>. (WhatsApp is not auto-sent for applications — contact them using the number above.)</p>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0"/>
<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:8px">${esc(record.message)}</pre>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: adminInbox(),
          subject: "[Clip Services] New provider application",
          html,
        })
      : Promise.resolve(),
    notifyPushRole("admin", {
      title: "New provider application",
      body: record.name,
      url: "/admin/",
    })
  );
}

/** When admin updates booking status in dashboard */
export async function notifyBookingStatusCustomer(booking, status) {
  const labels = {
    confirmed: "Your booking is confirmed",
    completed: "Your booking is marked completed",
    cancelled: "Your booking has been cancelled",
    paid: "Payment recorded",
  };
  const line = labels[status] || `Booking status: ${status}`;
  const html = `<p>Hi ${esc(booking.firstName)},</p>
<p>${esc(line)} — reference <strong>${esc(booking.ref)}</strong>.</p>
<p>Questions? Reply on WhatsApp or email us.</p>
<p>— Clip Services</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: booking.email,
          subject: `${line} — ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushRole("customer", {
      title: line,
      body: booking.ref,
      url: "/clip-services-marketplace.html",
    })
  );
}

export async function notifyBookingStatusAdmin(booking, status) {
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: adminInbox(),
          subject: `[Clip Services] Booking ${booking.ref} → ${status}`,
          html: `<p>${esc(booking.ref)} is now <strong>${esc(status)}</strong>.</p><p>${esc(booking.firstName)} ${esc(booking.lastName)}</p>`,
        })
      : Promise.resolve(),
    notifyPushRole("admin", {
      title: `Booking ${status}`,
      body: booking.ref,
      url: "/admin/",
    })
  );
}
