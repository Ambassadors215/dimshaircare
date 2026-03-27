# Clip Services

> A two-sided local service marketplace connecting customers with verified providers in Salford Quays & MediaCityUK, Manchester.

**Live:** [clips-service.vercel.app](https://clips-service.vercel.app)

## Overview

Clip Services is a full-stack Progressive Web App (PWA) that lets customers browse, book, and pay for local services — from cleaning and errands to dog walking and handyman tasks. Providers can apply to join the platform, and an admin dashboard manages bookings, contacts, and provider applications in real time.

Built as a solo end-to-end project covering product strategy, UX design, full-stack development, and deployment.

## Features

- **Service marketplace** with category filtering, search, and detailed service cards
- **Multi-step booking flow** with real-time validation, date/time pickers, and smart form UX
- **Stripe Checkout** integration for secure card payments with webhook confirmation
- **PWA** — installable on iOS and Android with offline support and custom install guides
- **Push notifications** (Web Push via VAPID) for customers and admins
- **Transactional email** via Brevo SMTP for booking confirmations, payment receipts, and status updates
- **Admin dashboard** — view/search/filter bookings, update statuses, export CSV, manage contacts
- **Provider application** workflow with email acknowledgement
- **Responsive design** optimised for mobile-first with touch-friendly interactions
- **Legal compliance** — Terms of Service, Privacy Policy, and Disclaimer pages

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, vanilla JavaScript (single-page architecture) |
| Backend | Node.js serverless functions (Vercel) |
| Database | Redis via Vercel KV (ioredis) |
| Payments | Stripe Checkout + Webhooks |
| Email | Brevo SMTP (nodemailer) |
| Push | Web Push API (web-push + VAPID) |
| Hosting | Vercel (auto-deploy from GitHub) |
| PWA | Service Worker, Web App Manifest, offline fallback |

## Project Structure

```
├── clip-services-marketplace.html   # Main marketplace UI
├── admin/index.html                 # Admin dashboard
├── api/                             # Serverless API routes
│   ├── booking.js                   #   POST /api/booking
│   ├── contact.js                   #   POST /api/contact
│   ├── stripe-checkout.js           #   POST /api/stripe-checkout
│   ├── stripe-webhook.js            #   POST /api/stripe-webhook
│   ├── push-vapid.js                #   GET  /api/push-vapid
│   ├── push-subscribe.js            #   POST /api/push-subscribe
│   └── admin/                       #   Admin CRUD endpoints
├── lib/                             # Shared backend modules
│   ├── email.js                     #   Brevo SMTP transport
│   ├── push.js                      #   Web Push configuration
│   ├── notify.js                    #   Notification orchestration
│   └── kv-store.js                  #   Redis data layer
├── sw.js                            # Service Worker
├── manifest.webmanifest             # PWA manifest
├── offline.html                     # Offline fallback page
├── terms.html                       # Terms of Service
├── privacy-policy.html              # Privacy Policy
├── disclaimer.html                  # Legal disclaimer
├── clip-services-prd-v2.html        # Product Requirements Document
└── clip-services-notifications.md   # Notification matrix
```

## Notification System

Dual-channel notifications (email + PWA push) cover the full booking lifecycle:

| Event | Customer | Admin |
|-------|----------|-------|
| Booking submitted | Email + Push | Email + Push |
| Checkout started | Email + Push | Email + Push |
| Payment confirmed | Email + Push | Email + Push |
| Status change (confirmed/completed/cancelled) | Email + Push | — |
| Provider application | Email | Email + Push |

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
3. Set environment variables as listed in `.env.example`
4. Push to `main` — Vercel auto-deploys

## Project Documents

- **Product Requirements Document** — [`clip-services-prd-v2.html`](clip-services-prd-v2.html) covers market analysis, user personas, feature specifications, go-to-market strategy, and strategic recommendations
- **Notification Matrix** — [`clip-services-notifications.md`](clip-services-notifications.md) documents every notification trigger, channel, and recipient

## Author

**Sonia Chidinma Otikpa**

Built as a demonstration of end-to-end product management and full-stack development — from PRD to production deployment.
