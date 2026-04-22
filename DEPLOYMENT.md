# Deploying Clip Services + Dim's Haircare (one repo)

Both Vercel projects can use **the same Git branch** and **the same `vercel.json`**. The correct homepage is chosen by **hostname** in `middleware.js`:

| Host | `/` shows |
|------|-----------|
| `clipservice.app`, `clips-service*.vercel.app`, previews for **clips-service** | Clip Services marketplace |
| `dimshaircare.vercel.app`, `dimshaircare-*-*.vercel.app` (previews), `www.dimshaircare.vercel.app` | `dimshaircare.html` (Dim's Haircare) |

## Vercel checklist

1. **clips-service** — connect [Clips-Service-](https://github.com/Ambassadors215/Clips-Service-) (or your fork), production branch `main`. Attach **clipservice.app** here only.
2. **dimshaircare** (optional second project) — if you use it, connect the **same** GitHub repo [`Clips-Service-`](https://github.com/Ambassadors215/Clips-Service-) and branch `main` (do **not** rely on a separate `dimshaircare` GitHub repo for this codebase). Keep **dimshaircare.vercel.app** here. Do **not** attach clipservice.app to this project.

## Custom domain for the hair site

1. In Vercel → **dimshaircare** → Domains → add e.g. `dimshaircare.co.uk`.
2. In `middleware.js`, uncomment/add hosts in `EXTRA_HAIR_HOSTS` (e.g. `dimshaircare.co.uk`, `www.dimshaircare.co.uk`).
3. Commit and redeploy.

## APIs (booking / contact)

Both sites call **`/api/booking`** and **`/api/contact`**. They must be deployed with the **same project** that serves the HTML (so Redis/Stripe env vars apply). If you ever split the hair site to a **static-only** deployment without APIs, change those `fetch` URLs to `https://clipservice.app/api/...` and add CORS on the API.

## Git remotes

- **`origin`** should point at **[Clips-Service-](https://github.com/Ambassadors215/Clips-Service-)**. Production work is pushed here so **[clips-service](https://vercel.com/ambassadors215s-projects/clips-service)** on Vercel updates.
- Do **not** use **`dimshaircare`** as `origin` — keep **`origin`** = Clips-Service- only.
- Optional mirror: add **`dimshaircare`** → `https://github.com/Ambassadors215/dimshaircare.git`. After `git push origin main`, run **`git push dimshaircare main`** so the [dimshaircare](https://github.com/Ambassadors215/dimshaircare) repo matches [Clips-Service-](https://github.com/Ambassadors215/Clips-Service-) (same `main` history).

Push to the remote connected to each Vercel project when you want that deployment to update.
