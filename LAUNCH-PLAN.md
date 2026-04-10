# Clip Services — Launch Plan

**Launch Date:** Friday, 4 April 2026
**Platform:** [clipservice.app](https://clipservice.app)
**Owner:** Sonia Chidinma Otikpa

---

## Pre-Launch Checklist

### 1. Stripe (Payments) — CRITICAL

- [ ] **Switch from test keys to live keys** in Vercel environment variables
  - `STRIPE_SECRET_KEY` → live key (`sk_live_...`)
  - Update `STRIPE_WEBHOOK_SECRET` for the production webhook endpoint
- [ ] **Webhook endpoint** (do this in **Test** and again in **Live** when you go live):
  - URL: `https://clipservice.app/api/stripe-webhook`
  - Events: `checkout.session.completed`, `account.updated`
  - Copy the signing secret (`whsec_…`) → set as `STRIPE_WEBHOOK_SECRET` on Vercel (must match the same mode as `STRIPE_SECRET_KEY`: test `whsec_` with `sk_test_`, live `whsec_` with `sk_live_`)
  - A **test-mode** endpoint can be created via Stripe Dashboard → Developers → Webhooks → Add endpoint, or with the Stripe API
- [ ] **Test a real payment** (£5 minimum) end-to-end on live keys
- [ ] **Verify refund process** — confirm you can issue refunds from Stripe Dashboard
- [ ] **Check Stripe Connect** — ensure provider onboarding flow works with live keys

### 2. Domain & DNS

- [x] **Custom domain** — [clipservice.app](https://clipservice.app) (Vercel preview URL optional for testing)
  - If custom domain: add it in Vercel Dashboard → Settings → Domains
  - Update `SITE_URL` environment variable to match
  - Stripe success/cancel URLs will use this automatically
- [ ] **Update `SITE_URL`** on Vercel if domain changes
- [ ] **Verify SSL certificate** is active (automatic on Vercel)

### 3. Email (Brevo)

- [ ] **Verify sender email** (`soniaotikpa@gmail.com`) is confirmed in Brevo
- [ ] **Test a booking flow** — check customer receives confirmation email
- [ ] **Test provider application** — check admin receives KYC email with attachments
- [ ] **Check email deliverability** — ensure emails don't land in spam

### 4. Push Notifications

- [ ] **Verify VAPID keys** are set on Vercel (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`)
- [ ] **Test admin push** — go to `/admin`, enable push alerts, verify notification appears
- [ ] **Test customer push** — enable alerts on main site, make a booking, verify notification

### 5. Content & Legal

- [ ] **Review Terms of Service** (`/terms`) — ensure all clauses are accurate
- [ ] **Review Privacy Policy** (`/privacy-policy`) — ensure GDPR/UK compliance
- [ ] **Review Disclaimer** (`/disclaimer`) — ensure liability limitations are clear
- [ ] **Check WhatsApp number** in footer and contact links — confirm it's active
- [ ] **Check email address** in footer — `clipservices26@gmail.com` (or your branded domain inbox when ready)
- [ ] **Check social media links** — Instagram and TikTok profiles are live

### 6. User Experience

- [ ] **Test full booking flow** on mobile (iPhone + Android)
- [ ] **Test provider application** on mobile — form, file uploads, submission
- [ ] **Test search and category filtering** — all 8 categories work
- [ ] **Test PWA installation** on iPhone (Safari → Add to Home Screen)
- [ ] **Test PWA installation** on Android (Chrome → Install)
- [ ] **Verify offline page** works when internet is disconnected
- [ ] **Check all pages load** — marketplace, admin, terms, privacy, disclaimer
- [ ] **Test modal booking form** — step progress, validation, Stripe redirect

### 7. Admin Dashboard

- [ ] **Login to admin** at `https://clipservice.app/admin`
- [ ] **Set a strong ADMIN_TOKEN** (32+ characters, random) — update on Vercel
- [ ] **Test all tabs** — Bookings, Applications, Providers
- [ ] **Test CSV export** — download and verify data format
- [ ] **Test booking status update** — change status and verify it saves
- [ ] **Test Stripe Connect** — add a test provider, generate onboarding link

### 8. Security

- [x] **Security headers** configured in `vercel.json` (HSTS, X-Frame-Options, etc.)
- [x] **No secrets in source code** — all via Vercel env vars
- [x] **HTML injection fixed** in KYC email
- [x] **Error messages masked** — no internal errors leaked to clients
- [x] **Admin auth hardened** — constant-time token comparison
- [x] **Provider ID whitelist** — prevents unauthorised payout routing
- [ ] **Generate new ADMIN_TOKEN** for production (don't reuse test token)

### 9. Performance

- [ ] **Run Lighthouse audit** on mobile — target 90+ performance, accessibility, SEO
- [ ] **Check Google PageSpeed Insights** — verify no critical issues
- [ ] **Verify Service Worker caching** — fonts, assets load from cache on repeat visits
- [ ] **Check load time** on slow 3G connection

---

## Launch Day Plan (Friday)

### Morning (Pre-Launch)

| Time | Task |
|------|------|
| 09:00 | Switch Stripe to **live keys** on Vercel |
| 09:10 | Set up **production webhook** in Stripe Dashboard |
| 09:20 | Update `ADMIN_TOKEN` to a new, strong value |
| 09:30 | Make a **test payment** (£5) with a real card |
| 09:35 | Verify payment appears in Stripe Dashboard + booking in admin |
| 09:40 | Verify **email confirmation** received for test booking |
| 09:45 | Issue a **test refund** from Stripe Dashboard |
| 09:50 | Final **mobile walkthrough** — full customer journey |
| 10:00 | Final **admin dashboard check** — all sections working |

### Launch (10:30)

| Time | Task |
|------|------|
| 10:30 | **Go live** — post on Instagram, TikTok, WhatsApp status |
| 10:35 | Share link in local community WhatsApp groups |
| 10:40 | Post on X/Twitter with launch announcement |
| 10:45 | Update Instagram bio with website link |
| 11:00 | Monitor first 30 minutes — watch admin dashboard for bookings |

### Afternoon (Post-Launch Monitoring)

| Time | Task |
|------|------|
| 12:00 | Check Vercel logs for any API errors |
| 12:30 | Check Stripe Dashboard for payment issues |
| 13:00 | Check Brevo for email delivery stats |
| 14:00 | Respond to any WhatsApp enquiries |
| 16:00 | End-of-day status check — bookings, applications, errors |

---

## Launch Announcement Template

### Social Media Post

```
🚀 Clip Services is LIVE!

Need a runner, cleaner, handyman, or dog walker in Salford Quays?
Book verified local providers — real people, real service, done today.

💳 Secure card payments
📱 Install as an app on your phone
🟢 Available now

Book now → clipservice.app

Want to offer your services? Apply for free on the site.

#ClipServices #SalfordQuays #MediaCityUK #Manchester #LocalServices
```

### WhatsApp Message

```
Hey! I just launched Clip Services — a local service marketplace for Salford Quays 🚀

You can book runners, cleaners, handymen, dog walkers, and more — all verified local providers.

Check it out: clipservice.app

If you offer any services, you can apply to join for free! 💪
```

---

## Post-Launch (Week 1)

| Day | Task |
|-----|------|
| Sat | Monitor bookings, respond to all enquiries within 1 hour |
| Sun | Post customer testimonial / behind-the-scenes content |
| Mon | Review first week's data — bookings, applications, bounce rate |
| Tue | Follow up with any pending provider applications |
| Wed | Post another social media update with booking stats |
| Thu | Review customer feedback, identify any UX improvements |
| Fri | Week 1 retrospective — what worked, what to improve |

---

## Post-Launch Enhancements (Weeks 2-4)

1. **Customer reviews system** — allow customers to rate and review providers after service completion
2. **Provider dashboard** — self-service portal for providers to manage availability and view earnings
3. **SMS notifications** — backup channel for booking confirmations
4. **Recurring bookings** — allow weekly/monthly cleaning and dog walking schedules
5. **Referral programme** — "Refer a friend, get £5 off your next booking"
6. **Google My Business** listing — improve local SEO
7. **Blog / content** — "Best cleaning tips for Salford Quays apartments" etc.

---

## Emergency Contacts

| Situation | Action |
|-----------|--------|
| Website down | Check Vercel Dashboard status, review deployment logs |
| Payment failing | Check Stripe Dashboard, verify webhook is active, check live keys |
| Emails not sending | Check Brevo Dashboard, verify SMTP credentials |
| Push not working | Check VAPID keys on Vercel, verify Service Worker is registered |
| Customer complaint | Respond on WhatsApp within 30 minutes, mediate resolution |
| Security incident | Rotate ADMIN_TOKEN immediately, check Vercel logs, disable affected endpoint |

---

**Status:** Pre-launch preparation in progress. All critical security fixes applied.
