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

### Free storage (Google Sheets)

To store submissions for free, use Google Sheets via a Google Apps Script webhook.

1) Create a Google Sheet (e.g. tabs `booking` and `contact`)
2) In Google Apps Script, deploy a Web App that accepts POST and appends rows
3) In Vercel project settings → Environment Variables, set:

- `GOOGLE_SHEETS_WEBHOOK_URL` = your Apps Script Web App URL

If `GOOGLE_SHEETS_WEBHOOK_URL` is not set, submissions will still work but will only be logged in Vercel function logs.

## Admin backend (free)

This repo includes a lightweight admin dashboard:

- **Admin UI**: `/admin` (static page)
- **Admin API**: `/api/admin/*` (serverless)

### What you can do in admin

- View bookings + contact messages
- Search/filter
- Export CSV
- Update booking status (`new`, `confirmed`, `completed`, `cancelled`)

### Fix "GOOGLE_SHEETS_ADMIN_API_URL not configured"

Add these 3 env vars in **Vercel → Project → Settings → Environment Variables**:

| Name | Value |
|------|-------|
| `ADMIN_TOKEN` | `dhc_a8f2k9m4x7q1w5e3r6t0y2u8i4o7p1s9` (or your own secret) |
| `GOOGLE_SHEETS_ADMIN_API_URL` | Your Apps Script Web App URL (see below) |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Same URL as above |

### Google Apps Script Admin API (required)

1) Create a Google Sheet with tabs:
   - `bookings`
   - `contacts`
2) Open Extensions → Apps Script
3) Paste `apps-script/Code.gs`
4) Apps Script → Project Settings → Script Properties:
   - `ADMIN_TOKEN` = same value as Vercel `ADMIN_TOKEN`
5) Deploy → New deployment → Web app
   - Execute as: Me
   - Who has access: Anyone
6) Copy the Web App URL into Vercel as `GOOGLE_SHEETS_ADMIN_API_URL`

Then open `/admin`, paste the same token, and you’ll see your data.

