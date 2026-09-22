# PassTLC

Independent NYC TLC license exam practice platform. Original build — not
affiliated with the NYC Taxi and Limousine Commission.

## Stack
- Next.js 14 (App Router, TypeScript) — frontend + backend (API routes + server actions) in one app
- Tailwind CSS — responsive, mobile-first UI
- Prisma + SQLite (dev) — swap `DATABASE_URL` to Postgres for production
- Custom JWT auth (httpOnly cookie, bcrypt password hashing)
- Stripe Checkout + webhooks — $20/month subscription

## Setup

```bash
npm install
cp .env.example .env       # already done for you in this build; edit values as needed
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

App runs at http://localhost:3000.

## Seeded admin account

```
Email:    admin@passtlc.com
Password: PassTLC-Admin!2026
```

**Change this password immediately after first login** (there's no in-app
"change password" flow yet — do it directly in the database, or add one
before going live). These credentials also live in `.env` as `ADMIN_EMAIL`
/ `ADMIN_PASSWORD` and are re-applied every time you run `npm run db:seed`.

Sign in at `/signin`, then visit `/admin`.

## Free trial / subscription logic
- Every new account gets 50 free question attempts (`User.questionsAnswered`,
  capped in `src/lib/trial.ts`).
- Once the cap is hit, `/api/attempt` returns HTTP 402 and the UI shows an
  upgrade prompt instead of the next question.
- `subscriptionStatus: ACTIVE` bypasses the cap entirely. This flips to
  `ACTIVE` via the Stripe webhook (`/api/webhook/stripe`) when a
  subscription is created, or manually by an admin from `/admin/users`.

## Stripe setup (required for real payments)
1. Create a $20/month recurring Price in the Stripe dashboard (test mode
   first).
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in `.env`.
3. Run `stripe listen --forward-to localhost:3000/api/webhook/stripe`
   locally, copy the printed webhook secret into `STRIPE_WEBHOOK_SECRET`.
4. In production, add a webhook endpoint in the Stripe dashboard pointing
   at `https://yourdomain.com/api/webhook/stripe` for
   `checkout.session.completed`, `customer.subscription.updated/created/deleted`.

Without these env vars set, `/api/checkout` returns a clear 501 error
instead of failing silently.

## Content
Categories and questions are seeded from `prisma/seed.ts` with a small set
of original example questions per category (Customer Service, Geography 1,
Geography 2, Safe Driving, TLC Rules 1 & 2, Vision Zero). Replace/expand
this content with your own verified question bank via `/admin/questions`
before launch — the seeded set is illustrative, not exam-complete.

## SEO
- Per-page metadata via Next's Metadata API (`src/app/**/page.tsx`)
- `/sitemap.xml` and `/robots.txt` generated dynamically (`src/app/sitemap.ts`, `robots.ts`)
- Open Graph tags in the root layout
- Semantic headings, descriptive link text, mobile-first responsive layout

## Testing
```bash
npm test
```
Covers trial-limit logic (`tests/trial.test.ts`) and password hashing
(`tests/auth.test.ts`). Manual verification during the build also confirmed:
signup → dashboard flow, category quiz answering + trial counter increment,
trial-block after 50 questions, admin login + question CRUD + user
subscription toggle, sitemap/robots output, and a production build.

## Production checklist (not done for you)
- Swap SQLite for Postgres (`DATABASE_URL`) — SQLite is fine for dev/small
  scale, not for concurrent production writes.
- Set a strong random `JWT_SECRET`.
- Put real Stripe live keys in production env, not `.env` in the repo.
- Add rate limiting to `/api/auth/*` (not included).
- Add a password-reset flow (not included).
- Replace seeded questions with a real, reviewed question bank.
