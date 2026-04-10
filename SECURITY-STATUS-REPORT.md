# Clip Services — Security & Status Report

**Date:** 27 March 2026
**Author:** Sonia Chidinma Otikpa
**Deployment:** [clipservice.app](https://clipservice.app)
**Status:** Pre-launch review complete

---

## 1. Security Audit Summary

### Secrets & Environment Variables

| Variable | Status | Notes |
|----------|--------|-------|
| `ADMIN_TOKEN` | Configured | Stored on Vercel, never in code |
| `KV_REDIS_URL` | Configured | Vercel KV connection string |
| `STRIPE_SECRET_KEY` | Configured | Test keys active (switch to live before launch) |
| `STRIPE_WEBHOOK_SECRET` | Configured | Validates Stripe webhook signatures |
| `VAPID_PUBLIC_KEY` | Configured | Web Push public key |
| `VAPID_PRIVATE_KEY` | Configured | Web Push private key (encrypted on Vercel) |
| `BREVO_SMTP_USER` | Configured | Transactional email credentials |
| `BREVO_SMTP_KEY` | Configured | Brevo API key (encrypted on Vercel) |
| `SITE_URL` | Configured | Production origin URL |

**All secrets are stored as Vercel environment variables (encrypted at rest). No secrets are hardcoded in source code. `.env.local` is gitignored.**

### .gitignore Coverage

| Item | Protected |
|------|-----------|
| `.env` / `.env.local` / `.env.*` | Yes |
| `node_modules/` | Yes |
| Personal files (`*.pdf`, `*.jpeg`, personal HTML) | Yes |
| OS files (`.DS_Store`, `Thumbs.db`) | Yes |
| IDE configs (`.vscode/`, `.idea/`) | Yes |

### Repository Security

- Repository is **public** on GitHub — no secrets are committed
- `.env.example` provides a template with empty values only
- Personal documents and images are excluded via `.gitignore`

---

## 2. API Security Audit

### Issues Found & Fixed

| Issue | Severity | File | Fix Applied |
|-------|----------|------|-------------|
| HTML injection in KYC admin email | **High** | `api/contact.js` | Added `escapeHtml()` to sanitise user input before embedding in HTML email |
| Internal error messages leaked to client | **High** | `api/connect.js` | Replaced `e.message` with generic error strings |
| Internal error messages leaked to client | **High** | `api/admin/providers.js` | Replaced `e.message` with generic error strings |
| Client-controlled `providerId` for Stripe transfers | **High** | `api/stripe-checkout.js` | Added whitelist validation of `providerId` values |
| Admin token compared with `===` (timing attack) | **Medium** | `api/admin/_utils.js` | Replaced with constant-time string comparison |
| `ADMIN_TOKEN not configured` leaked to client | **Medium** | `api/admin/_utils.js` | Changed to generic "Server configuration error" |
| No security headers | **Medium** | `vercel.json` | Added HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| API responses cacheable | **Low** | `vercel.json` | Added `no-store` Cache-Control for all `/api/` routes |

### Remaining Low-Risk Items (Accepted)

| Item | Severity | Rationale |
|------|----------|-----------|
| No rate limiting on public endpoints | Low | Vercel provides infrastructure-level DDoS protection. Can add Vercel Edge rate limiting if abuse occurs |
| No explicit CORS headers | Low | Same-origin deployment (frontend + API on same Vercel domain) — browser enforces same-origin by default |
| Admin token sent via header (not cookie) | Low | Acceptable for admin-only dashboard over HTTPS |

---

## 3. Security Headers (vercel.json)

All pages and API routes now include:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS for 2 years |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Block clickjacking via iframes |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |

---

## 4. Authentication & Authorisation

| Endpoint Pattern | Auth Required | Method |
|------------------|---------------|--------|
| `POST /api/booking` | No (public) | POST only |
| `POST /api/contact` | No (public) | POST only |
| `POST /api/stripe-checkout` | No (public) | POST only |
| `POST /api/stripe-webhook` | Stripe signature | POST only |
| `GET /api/push-vapid` | No (public key only) | GET only |
| `POST /api/push-subscribe` | Admin token (admin role) | POST only |
| `GET /api/admin/*` | Admin token (header) | GET/POST |
| `GET/POST /api/connect` | Admin token (header) | GET/POST |

---

## 5. Payment Security

| Item | Status |
|------|--------|
| Stripe Checkout (hosted payment page) | Card details never touch our servers |
| Webhook signature verification | Active — rejects unsigned events |
| Provider ID whitelist for transfers | Active — prevents unauthorised payout routing |
| Platform fee calculation | Server-side only (15% computed on backend) |
| HTTPS enforcement | Active via HSTS header |

---

## 6. Data Storage

| Store | Contents | Access Control |
|-------|----------|----------------|
| Vercel KV (Redis) | Bookings, contacts, push subscriptions, provider records | `KV_REDIS_URL` (encrypted, server-side only) |
| Stripe | Payment data, Connect accounts | Stripe API keys (server-side only) |
| Browser localStorage | Admin token (per-device) | User-controlled |

---

## 7. Deployment Security

- **Vercel auto-deploy** from `main` branch on GitHub
- **Preview deployments** for pull requests (environment variables scoped)
- **No SSH access** to production — serverless architecture
- **Immutable deployments** — each push creates a new deployment
- **HTTPS** enforced on all Vercel deployments by default

---

## 8. Recommendations for Post-Launch

1. **Switch Stripe to live keys** before accepting real payments
2. **Set up Stripe webhook endpoint** in Stripe Dashboard for production URL
3. **Monitor Vercel logs** for API errors and unusual traffic patterns
4. **Add rate limiting** via Vercel Edge Middleware if spam/abuse is detected
5. **Rotate ADMIN_TOKEN** periodically and use a strong, random value (32+ characters)
6. **Enable Vercel Analytics** for traffic monitoring
7. **Set up uptime monitoring** (e.g. UptimeRobot, Vercel Checks)

---

**Report Status:** All high-severity issues resolved. System is ready for launch.
