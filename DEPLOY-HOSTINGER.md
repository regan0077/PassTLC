# Deploying PassTLC on Hostinger (Node.js Web Apps hosting)

## 1. Node version — set it to 22.x or 24.x

Hostinger offers 18.x, 20.x, 22.x and 24.x. **Pick 22.x or 24.x.**

Why this matters: `better-sqlite3` ships a prebuilt native binary linked against
glibc 2.29+. Hostinger's image is older, which is exactly the
`GLIBC_2.29 not found` build failure. `src/lib/sqlite-driver.ts` falls back to
Node's built-in `node:sqlite`, which has no native binary — but that module
only exists from Node 22.13. On Node 18 or 20 **both** drivers fail and the
build dies again.

## 2. Put the database OUTSIDE the build directory — critical

Hostinger deploys into versioned folders:

```
/home/<user>/domains/<domain>/hbuilds/versions/<build-id>/
```

with a `current` symlink. **Everything under `hbuilds/` is overwritten on every
deploy.** The default DB path is `<app>/data/passtlc.db`, so with default
settings every deploy wipes all users, payments, questions and reviews.

Create a directory outside that tree once, over SSH:

```bash
mkdir -p /home/<user>/passtlc-data
```

then set `DATABASE_FILE` (below). The app creates the file and runs its
migrations on first boot.

## 3. Environment variables (hPanel → your app → Environment variables)

Required:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_FILE` | `/home/<user>/passtlc-data/passtlc.db` |
| `UPLOAD_DIR` | `/home/<user>/passtlc-data/uploads` — payment screenshots. Defaults to a directory next to the database, so setting `DATABASE_FILE` correctly is usually enough; set it explicitly if you want them elsewhere. Same rule applies: **outside `hbuilds/`**, or every deploy deletes the proof-of-payment images. |
| `JWT_SECRET` | 32+ random bytes — `openssl rand -base64 48`. Never commit it. |
| `NEXT_PUBLIC_SITE_URL` | `https://passtlc.com` — every canonical, hreflang, sitemap and OG URL derives from this. Wrong value = wrong canonicals sitewide. |

Seeding the first admin (used by `scripts/seed.ts`, not at runtime):

| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | your admin login. Change the password after first sign-in. |

Optional:

| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID (`G-XXXXXXX`) |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console verification token |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION`, `NEXT_PUBLIC_YANDEX_VERIFICATION` | as above |
| `NEXT_PUBLIC_TWITTER_HANDLE` | for Twitter card metadata |
| `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | only if card payments are enabled; Zelle flow needs none of these |

Do **not** set `PASSTLC_SQLITE_DRIVER` — the driver picks itself. Set it to
`node` only to reproduce the fallback path deliberately.

## 4. Build settings

- Output directory: `.next`
- Build command: `npm run build`
- Start command: `npm run start`

`next start` needs a long-lived process, which Hostinger's Node app manager
provides. Do not try to export a static site — the admin panel, auth and
question APIs are server-rendered.

## 5. First deploy

1. Deploy. The build should now succeed on Node 22/24.
2. SSH in and seed the database once:
   ```bash
   cd /home/<user>/domains/<domain>/hbuilds/current
   DATABASE_FILE=/home/<user>/passtlc-data/passtlc.db npm run db:seed
   ```
3. Sign in at `https://passtlc.com/admin` and change the admin password.

## 6. After go-live

- Submit `https://passtlc.com/sitemap.xml` in Google Search Console.
- Confirm `https://passtlc.com/robots.txt` points at that sitemap.
- Back up `/home/<user>/passtlc-data/` on a schedule — both the database and
  the uploaded payment screenshots live there, and neither is in the repo.

## Notes

- SQLite is a single writer on one machine. That is fine at this scale, but it
  rules out running two app instances against the same file. If you ever scale
  horizontally, move to Postgres/MySQL first.
- The admin overview shows which SQLite driver is live, so you can confirm
  whether the fallback is in use.
