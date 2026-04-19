# Clip Services

> A two-sided local service marketplace connecting customers with verified providers in Salford Quays & MediaCityUK, Manchester.

**Live:** [clipservice.app](https://clipservice.app)

This repository also contains **Dim's Haircare** (`dimshaircare.html`): on [dimshaircare.vercel.app](https://dimshaircare.vercel.app) the salon homepage is served; on Clip’s domain the marketplace is served (see `middleware.js` and [DEPLOYMENT.md](./DEPLOYMENT.md)).

---

## Overview

Clip Services is a full-stack Progressive Web App (PWA) that lets customers browse, book, and pay for local services — from cleaning and errands to dog walking, handyman tasks, and hair & beauty. Providers apply through a KYC-verified onboarding process, and a real-time admin dashboard manages bookings, applications, Stripe Connect payouts, and push notifications.

Built as a solo end-to-end project covering product strategy, UX design, full-stack development, payment integration, and production deployment.

## Features

### Customer Experience
- **Service marketplace** — category filtering, instant search, detailed service cards with SVG icons
- **Multi-step booking flow** — real-time validation, date/time pickers, phone auto-formatting, step progress indicator
- **Stripe Checkout** — secure card payments with automatic 15% platform fee calculation
- **Booking confirmations** — email receipt + push notification on payment
- **PWA** — installable on iOS and Android with offline support, custom iOS install guide

### Provider Experience
- **Provider application** — comprehensive form with service selection, rate setting, availability
- **KYC verification** — ID document upload, DBS status, right-to-work check, emergency contact
- **Automated onboarding** — email confirmation to applicant + admin notification with attached documents
- **Stripe Connect** — automated payment splitting (provider gets 85%, platform keeps 15%)

### Admin Dashboard
- **Dark-themed dashboard** — WADESK-inspired UI with stat cards, glowing borders, and responsive grid
- **Booking management** — search, filter, status updates, CSV export
- **Provider management** — Stripe Connect onboarding, status monitoring, link generation
- **Push notifications** — real-time browser alerts for new bookings, payments, and applications

### Security
- **Security headers** — HSTS, X-Frame-Options, CSP, X-Content-Type-Options
- **Input sanitisation** — HTML escaping, text truncation, email validation on all endpoints
- **Constant-time auth** — timing-safe admin token comparison
- **No secrets in code** — all credentials via Vercel environment variables
- **Stripe webhook verification** — signature validation on all payment events

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, vanilla JavaScript (single-page architecture) |
| Backend | Node.js serverless functions (Vercel) |
| Database | Redis via Vercel KV (ioredis) |
| Payments | Stripe Checkout + Connect + Webhooks |
| Email | Brevo SMTP (nodemailer) |
| Push | Web Push API (web-push + VAPID) |
| Hosting | Vercel (auto-deploy from GitHub) |
| PWA | Service Worker v4, Web App Manifest, offline fallback |

## Project Structure

```
├── clip-services-marketplace.html   # Main marketplace UI (customer + provider views)
├── admin/index.html                 # Admin dashboard
├── api/                             # Serverless API routes
│   ├── booking.js                   #   POST /api/booking
│   ├── contact.js                   #   POST /api/contact (provider applications)
│   ├── connect.js                   #   GET/POST /api/connect (Stripe Connect)
│   ├── stripe-checkout.js           #   POST /api/stripe-checkout
│   ├── stripe-webhook.js            #   POST /api/stripe-webhook
│   ├── push-vapid.js                #   GET /api/push-vapid
│   ├── push-subscribe.js            #   POST /api/push-subscribe
│   └── admin/                       #   Admin endpoints (auth-protected)
│       ├── _utils.js                #   Shared auth + helpers
│       ├── bookings.js              #   GET /api/admin/bookings
│       ├── contacts.js              #   GET /api/admin/contacts
│       ├── providers.js             #   GET /api/admin/providers
│       ├── update-booking.js        #   POST /api/admin/update-booking
│       └── ping.js                  #   GET /api/admin/ping
├── lib/                             # Shared backend modules
│   ├── email.js                     #   Brevo SMTP transport
│   ├── push.js                      #   Web Push (VAPID)
│   ├── notify.js                    #   Notification orchestration
│   └── kv-store.js                  #   Redis data layer
├── sw.js                            # Service Worker (v4, font caching, push actions)
├── manifest.webmanifest             # PWA manifest
├── offline.html                     # Offline fallback page
├── vercel.json                      # Vercel config (security headers, clean URLs)
├── terms.html                       # Terms of Service
├── privacy-policy.html              # Privacy Policy
├── disclaimer.html                  # Legal disclaimer
├── SECURITY-STATUS-REPORT.md        # Security audit & status report
├── LAUNCH-PLAN.md                   # Pre-launch checklist & launch plan
└── .env.example                     # Environment variable template
```

## Notification System

Dual-channel notifications (email + PWA push) cover the full booking lifecycle:

| Event | Customer | Admin |
|-------|----------|-------|
| Booking submitted | Email + Push | Email + Push |
| Checkout started | Email + Push | Email + Push |
| Payment confirmed | Email + Push | Email + Push |
| Status change (confirmed/completed/cancelled) | Email + Push | — |
| Provider application submitted | Email | Email + Push |
| Stripe Connect account updated | — | Email |

## Local Development

1. **Prerequisites:** Node.js 18+
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure environment:** Copy `.env.example` to `.env.local` and fill in your credentials
4. **Run locally:**
   ```bash
   npm start
   ```
   Open `http://localhost:3000`

## Deployment (Vercel)

1. Connect this repo to a Vercel project
2. Add a **KV (Redis)** database under Vercel Storage
3. Set all environment variables listed in `.env.example`
4. Push to `main` — Vercel auto-deploys

### Troubleshooting: applications not in admin

Provider applications are stored in Redis under the key `{KV_PREFIX}:contacts` (default prefix `cs`). The admin **Applications** tab loads them from the same database — click **Refresh**. If the list is empty but submissions succeed, ensure **`KV_PREFIX` on Vercel matches** what was used when data was written (older deployments may have used `dhc`; set `KV_PREFIX=dhc` temporarily to see legacy rows). Confirm **Brevo** (`BREVO_SMTP_*`, `EMAIL_FROM`, `ADMIN_EMAIL`) is set for admin emails; WhatsApp is **not** sent automatically for applications — use the **WhatsApp** link next to the applicant’s phone in the admin table.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KV_REDIS_URL` | Yes | Redis connection string (Vercel KV) |
| `ADMIN_TOKEN` | Yes | Admin dashboard auth token (32+ chars recommended) |
| `SITE_URL` | Yes | Production URL (e.g. `https://clipservice.app`) |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Only if you add Stripe.js on the frontend (Checkout uses server secret only) |
| `STRIPE_SECRET_KEY` | Yes | Stripe API secret key (`sk_test_…` or `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook signing secret (`whsec_…`) from Stripe Dashboard or API |
| `BREVO_SMTP_USER` | Yes | Brevo SMTP login |
| `BREVO_SMTP_KEY` | Yes | Brevo SMTP API key |
| `EMAIL_FROM` | Yes | Sender email address |
| `ADMIN_EMAIL` | Yes | Admin notification inbox |
| `VAPID_PUBLIC_KEY` | Yes | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Yes | Web Push VAPID private key |
| `VAPID_CONTACT_EMAIL` | Yes | VAPID contact email |

## Project Documents

- **Security & Status Report** — [`SECURITY-STATUS-REPORT.md`](SECURITY-STATUS-REPORT.md)
- **Launch Plan** — [`LAUNCH-PLAN.md`](LAUNCH-PLAN.md)
- **Product Requirements Document** — [`clip-services-prd-v2.html`](clip-services-prd-v2.html)
- **Notification Matrix** — [`clip-services-notifications.md`](clip-services-notifications.md)

## Author

**Sonia Chidinma Otikpa**

Built as a demonstration of end-to-end product management and full-stack development — from PRD to production deployment.

## License

All rights reserved. This project is proprietary.
