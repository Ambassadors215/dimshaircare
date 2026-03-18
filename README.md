# Dimshaircare

## Run locally (Windows / PowerShell)

1) Install Node.js 18+ (LTS).
2) In this folder:

```powershell
npm install
npm start
```

Then open `http://localhost:3000`.

## Deploy to Railway (quick)

- Create a new Railway project
- Add this repo as a service (from GitHub)
- Railway will run `npm start`
- `PORT` is set automatically (Railway provides it)

### Notes

- Submissions are stored to local JSON files under `data/` at runtime.
- `data/*.json` is gitignored (so real submissions won’t be committed).

## Deploy to Vercel

This repo includes Vercel serverless endpoints:

- `POST /api/booking`
- `POST /api/contact`

### Storage (Vercel KV)

Uses **Vercel KV** (Redis) — no Google Sheets. Create a KV database in Vercel → Storage, link to project.

## Admin backend (free)

This repo includes a lightweight admin dashboard:

- **Admin UI**: `/admin` (static page)
- **Admin API**: `/api/admin/*` (serverless)

### What you can do in admin

- View bookings + contact messages
- Search/filter
- Export CSV
- Update booking status (`new`, `confirmed`, `completed`, `cancelled`)

### Setup

1. **Vercel → Storage → Create Database → KV** (link to project)
2. **Environment Variables**: add `ADMIN_TOKEN` = `dhc_a8f2k9m4x7q1w5e3r6t0y2u8i4o7p1s9`
3. Redeploy. Open `/admin`, paste token, Test connection, Refresh.

