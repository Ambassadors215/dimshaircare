# Clip Services — full notification matrix (v3)

Channels: **Email** (Brevo SMTP), **PWA push** (VAPID), **WhatsApp** (manual / ops — not automated in code).  
Configure: `BREVO_SMTP_*`, `EMAIL_FROM`, `ADMIN_EMAIL`, `VAPID_*`, Redis for data.

Legend: ✅ implemented in `lib/notify.js` · 🔜 roadmap (wire cron/admin) · — not applicable

---

## Customer (booker)

| # | Trigger | Email | PWA push | Notes |
|---|---------|-------|----------|--------|
| C1 | Booking created (offline / WhatsApp path) | ✅ | ✅ | `notifyBookingSubmittedCustomer` |
| C2 | Stripe Checkout session created (“pay now”) | ✅ | ✅ | `notifyCheckoutStartedCustomer` |
| C3 | Card payment succeeded (Stripe webhook) | ✅ | ✅ | `notifyPaymentSucceededCustomer` |
| C4 | Admin sets booking status → confirmed / completed / cancelled / paid | ✅ | ✅ | `notifyBookingStatusCustomer` |
| C5 | Negotiation: new thread / offer / counter / accept / decline | ✅ | ✅ | Email + push to customer; `notifyNegotiationUpdate` |
| C6 | Provider application submitted (if customer also contacted) | — | — | Usually N/A for customers |
| C7 | Reminder 24h before appointment | 🔜 | 🔜 | Needs scheduled job + consent |
| C8 | Abandoned checkout (>24h awaiting payment) | 🔜 | 🔜 | Cron + KV scan |
| C9 | Review request after completed job | 🔜 | 🔜 | After `completed` + delay |

---

## Provider (listed pro)

| # | Trigger | Email | PWA push | Notes |
|---|---------|-------|----------|--------|
| P1 | Negotiation: new request / offer / counter / accept / decline | ✅ | ✅ | `notifyNegotiationUpdate` (recipient side) |
| P2 | Customer starts Stripe checkout (your job) | ✅ | ✅ | `notifyCheckoutStartedProvider` |
| P3 | Payment succeeded (payout pending) | Push ✅ | Email — | `notifyPaymentSucceededProvider` (push); payout email via Stripe |
| P4 | Admin publishes / updates listing | 🔜 | — | Optional “you’re live” email |
| P5 | Poor rating / strike warning | 🔜 | 🔜 | Moderation policy |

---

## Admin / operator (`ADMIN_EMAIL` + admin push channel)

| # | Trigger | Email | PWA push | Notes |
|---|---------|-------|----------|--------|
| A1 | New booking (any path) | ✅ | ✅ | `notifyBookingSubmittedAdmin` |
| A2 | Checkout started (awaiting card) | ✅ | ✅ | `notifyCheckoutStartedAdmin` |
| A3 | Card payment succeeded | ✅ | ✅ | `notifyPaymentSucceededAdmin` |
| A4 | New provider application (+ KYC in message) | ✅ | ✅ | `notifyProviderApplicationAdmin` |
| A5 | Negotiation activity (all types) | ✅ | ✅ | `notifyNegotiationUpdate` also pings **admin** push |
| A6 | Booking status changed (from dashboard) | ✅ email | ✅ push | `notifyBookingStatusAdmin` (in addition to customer email) |
| A7 | Stripe Connect account ready | 🔜 | — | Webhook `account.updated` — optional email |
| A8 | Dispute / refund flag | 🔜 | 🔜 | Manual or future `/api/dispute` |

---

## Security & compliance (optional alerts)

| # | Event | Channel | Notes |
|---|--------|---------|--------|
| S1 | Failed admin API auth (burst) | 🔜 | Rate-limit logs |
| S2 | Stripe webhook signature failure | Logs | Already logged |
| S3 | Redis / KV outage | 🔜 | Uptime monitor |

---

## Engagement (product roadmap)

| Idea | Purpose |
|------|---------|
| Push: “Someone viewed your profile” (cap 1/day) | Provider retention |
| Email digest: weekly “open negotiations” | Customer + provider |
| SMS fallback (Twilio) | High-value bookings only |
| In-app inbox (Phase 2) | Reduce email fatigue |

---

## Implementation map

| Function | File |
|----------|------|
| Booking, checkout, payment, status, negotiation, provider application | `lib/notify.js` |
| Push delivery | `lib/push.js` |
| Stripe events | `api/lib/handlers/stripe-webhook.js` + notify calls |

Update this file when adding new `notify*` functions.
