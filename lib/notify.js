/**
 * Booking / checkout / payment / negotiation / admin alerts.
 * Full channel matrix (customer · provider · admin): `clip-services-notifications.md`
 */
import { sendEmail, adminInbox, isEmailConfigured } from "./email.js";
import { notifyPushRole, notifyPushUserEmail, notifyPushProviderEmail } from "./push.js";

function normEmail(e) {
  return String(e || "")
    .trim()
    .toLowerCase();
}

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
    notifyPushUserEmail(booking.email, {
      title: "Booking received",
      body: `${booking.ref} — ${booking.service}`,
      url: `/user/?email=${encodeURIComponent(booking.email.trim())}`,
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
    notifyPushUserEmail(booking.email, {
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

export async function notifyCheckoutStartedProvider(providerEmail, booking) {
  if (!providerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerEmail)) return;
  const e = providerEmail.trim().toLowerCase();
  const path = `/provider/?email=${encodeURIComponent(e)}`;
  const html = `<p>The customer is completing card payment for <strong>${esc(booking.ref)}</strong>.</p>
<p>${esc(booking.service)} · total £${esc(String(booking.totalGBP ?? ""))}</p>
<p>— Clip Services</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: e,
          subject: `Customer paying — ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushProviderEmail(e, {
      title: "Customer paying",
      body: `${booking.ref} — ${booking.service}`,
      url: path,
    })
  );
}

export async function notifyPaymentSucceededCustomer(booking) {
  const isMarketplace = Boolean(booking.marketplaceOrder);
  const lines =
    isMarketplace && Array.isArray(booking.cartSnapshot)
      ? `<ul style="margin:12px 0;padding-left:20px">${booking.cartSnapshot
          .map((l) => `<li>${esc(String(l.qty))}× ${esc(String(l.item || ""))}</li>`)
          .join("")}</ul>`
      : "";
  const fulfil = booking.fulfillment === "delivery" ? "Delivery" : "Collection";
  const addr =
    booking.fulfillment === "delivery" && booking.deliveryAddress && typeof booking.deliveryAddress === "object"
      ? `<p><strong>Deliver to:</strong> ${esc(String(booking.deliveryAddress.line1 || ""))}, ${esc(
          String(booking.deliveryAddress.city || "")
        )} ${esc(String(booking.deliveryAddress.postcode || ""))}</p>`
      : "";
  const html = isMarketplace
    ? `<p>Hi ${esc(booking.firstName)},</p>
<p><strong>Payment received</strong> for order <strong>${esc(booking.ref)}</strong>.</p>
${lines}
<p><strong>Total paid:</strong> ${esc(String(booking.price || ""))}<br/>
<strong>Fulfilment:</strong> ${esc(fulfil)}</p>
${addr}
<p>The store has been notified. They may message you on WhatsApp to confirm pickup or delivery.</p>
<p>— Clip Services</p>`
    : `<p>Hi ${esc(booking.firstName)},</p>
<p><strong>Payment received</strong> for booking <strong>${esc(booking.ref)}</strong>.</p>
<p>We’ll WhatsApp you to confirm the time and details.</p>
<p>— Clip Services</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: booking.email,
          subject: isMarketplace ? `Order confirmed — ${booking.ref}` : `Payment confirmed — ${booking.ref}`,
          html,
        })
      : Promise.resolve(),
    notifyPushUserEmail(booking.email, {
      title: isMarketplace ? "Order confirmed" : "Payment confirmed",
      body: isMarketplace ? `${booking.ref} — thank you` : `${booking.ref} — we’ll confirm on WhatsApp`,
      url: `/user/?email=${encodeURIComponent(booking.email.trim())}`,
    })
  );
}

/** Email store owner: paid marketplace order + WhatsApp deep-link to message customer (no WA Business API). */
export async function notifyMarketplaceOrderPaidStoreOwner(listing, booking) {
  const email = String(listing?.email || "")
    .trim()
    .toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const phoneDigits = String(booking.phone || "").replace(/\D/g, "");
  const waCustomer =
    phoneDigits.length >= 10
      ? `https://wa.me/${phoneDigits.startsWith("0") ? "44" + phoneDigits.slice(1) : phoneDigits}`
      : "";
  const lines = Array.isArray(booking.cartSnapshot)
    ? booking.cartSnapshot.map((l) => `${l.qty}× ${l.item}`).join("\n")
    : String(booking.notes || "");
  const fulfil = booking.fulfillment === "delivery" ? "Delivery" : "Collection";
  const addr =
    booking.fulfillment === "delivery" && booking.deliveryAddress && typeof booking.deliveryAddress === "object"
      ? `\nAddress: ${booking.deliveryAddress.line1}, ${booking.deliveryAddress.city} ${booking.deliveryAddress.postcode}`
      : "";
  const html = `<p><strong>🛒 New paid order</strong> <strong>${esc(booking.ref)}</strong></p>
<pre style="font-family:ui-sans-serif,system-ui,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${esc(lines)}</pre>
<p><strong>Total:</strong> ${esc(String(booking.price || ""))}<br/>
<strong>Fulfilment:</strong> ${esc(fulfil)}${addr ? `<br/>${esc(addr.trim())}` : ""}</p>
<p><strong>Customer:</strong> ${esc(booking.firstName)} ${esc(booking.lastName)}<br/>
<strong>Email:</strong> ${esc(booking.email)}<br/>
<strong>WhatsApp:</strong> ${esc(booking.phone || "—")}</p>
${waCustomer ? `<p><a href="${esc(waCustomer)}">Open WhatsApp chat with customer</a></p>` : ""}
<p><a href="https://clipservice.app/store-owner/dashboard">Store dashboard</a></p>
<p style="color:#666;font-size:13px">Reply to the customer by WhatsApp or email to confirm timing.</p>`;
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: email,
          subject: `🛒 Paid order ${booking.ref} — ${String(listing.role || "Your store").slice(0, 80)}`,
          html,
        })
      : Promise.resolve(),
    notifyPushProviderEmail(email, {
      title: `Paid order ${booking.ref}`,
      body: `${booking.firstName} — ${booking.price}`,
      url: "/store-owner/dashboard",
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

export async function notifyPaymentSucceededProvider(providerEmail, booking) {
  if (!providerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(providerEmail)) return;
  const e = providerEmail.trim().toLowerCase();
  const path = `/provider/?email=${encodeURIComponent(e)}`;
  await notifyPushProviderEmail(e, {
    title: "Payment received",
    body: `${booking.ref} — ${booking.service}`,
    url: path,
  });
}

export async function notifyProviderApplicationApplicant(name, email, opts = {}) {
  const isStore = Boolean(opts.store);
  const html = isStore
    ? `<p>Hi ${esc(name.split(" ")[0] || "there")},</p>
<p>We’ve received your application to list your <strong>store or stall</strong> on Clip Services.</p>
<p>We’ll review it and contact you by WhatsApp or email within 48 hours.</p>
<p>— Clip Services</p>`
    : `<p>Hi ${esc(name.split(" ")[0] || "there")},</p>
<p>We’ve received your Clip Services provider application.</p>
<p>We’ll review it and WhatsApp you within 48 hours.</p>
<p>— Clip Services</p>`;
  if (isEmailConfigured()) {
    await sendEmail({
      to: email,
      subject: isStore
        ? "Store application received — Clip Services"
        : "Provider application received — Clip Services",
      html,
    }).catch((e) => console.error("EMAIL_APP_APPLICANT", e));
  }
}

export async function notifyProviderApplicationAdmin(record, opts = {}) {
  const isStore = Boolean(opts.store);
  const phoneLine = record.phone ? `<p><strong>WhatsApp / phone:</strong> ${esc(record.phone)}</p>` : "";
  const html = `<p><strong>${isStore ? "New store / stall application" : "New provider application"}</strong></p>
<p>${esc(record.name)} · <a href="mailto:${esc(record.email)}">${esc(record.email)}</a></p>
${phoneLine}
<p style="color:#555;font-size:13px">Full details are below and in your admin dashboard → <strong>Applications</strong> tab → <strong>Refresh</strong>. (WhatsApp is not auto-sent for applications — contact them using the number above.)</p>
<hr style="border:none;border-top:1px solid #ddd;margin:16px 0"/>
<pre style="font-family:ui-monospace,monospace;font-size:13px;white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:8px">${esc(record.message)}</pre>`;
  const soniaOps = (process.env.SONIA_OPS_EMAIL || "soniaotikpa@gmail.com").trim();
  await parallel(
    isEmailConfigured()
      ? sendEmail({
          to: adminInbox(),
          bcc: isStore && soniaOps.includes("@") ? soniaOps : undefined,
          subject: isStore
            ? "[Clip Services] New store application"
            : "[Clip Services] New provider application",
          html,
        })
      : Promise.resolve(),
    notifyPushRole("admin", {
      title: isStore ? "New store application" : "New provider application",
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
    notifyPushUserEmail(booking.email, {
      title: line,
      body: booking.ref,
      url: `/user/?email=${encodeURIComponent(booking.email.trim())}`,
    })
  );
}

export async function notifyNegotiationUpdate(neg, action, recipientEmail) {
  const actionLabels = {
    new_request: "New service request",
    offer: "Price offer received",
    counter: "Counter-offer received",
    accepted: "Price accepted — ready to pay",
    declined: "Offer declined",
  };
  const subject = `[Clip Services] ${actionLabels[action] || "Negotiation update"} — ${neg.id}`;
  const toCustomer = normEmail(recipientEmail) === normEmail(neg.customerEmail);
  const dashUrl = toCustomer
    ? `/user/?email=${encodeURIComponent(recipientEmail.trim())}`
    : `/provider/?email=${encodeURIComponent(recipientEmail.trim())}`;
  const html = `<p>${esc(actionLabels[action] || "Update")}</p>
<p><strong>Service:</strong> ${esc(neg.service)}<br/>
<strong>Reference:</strong> ${esc(neg.id)}</p>
<p><a href="${esc(process.env.SITE_URL || "https://clipservice.app")}${dashUrl}">View in your dashboard</a></p>
<p>— Clip Services</p>`;
  const title = actionLabels[action] || "Negotiation update";
  const pushBody = `${neg.id} · ${neg.service}`;
  const recipientPush = toCustomer
    ? notifyPushUserEmail(recipientEmail, { title, body: pushBody, url: dashUrl })
    : notifyPushProviderEmail(recipientEmail, { title, body: pushBody, url: dashUrl });
  await parallel(
    isEmailConfigured()
      ? sendEmail({ to: recipientEmail, subject, html })
      : Promise.resolve(),
    recipientPush,
    notifyPushRole("admin", {
      title,
      body: pushBody,
      url: "/admin/",
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
