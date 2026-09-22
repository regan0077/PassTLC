# PassTLC commerce platform — build status

## What is live in this commit

The **commerce core**: the data model and the engine that turns money into
credits and access. Everything else in the brief sits on top of this, so it
was built and proved first.

| Module | Purpose |
| --- | --- |
| `src/lib/schema-commerce.sql` | products, credit_ledger, memberships, coupons, orders, coupon_redemptions, payment_events, app_settings |
| `src/lib/credits.ts` | Append-only credit ledger + wallet summary |
| `src/lib/membership.ts` | Unlimited-access grants, renewal-extends-from-expiry |
| `src/lib/products.ts` | Admin-editable products (price, credits, bonus, duration) |
| `src/lib/coupons.ts` | Server-side coupon evaluation + admin CRUD + performance report |
| `src/lib/orders.ts` | Quoting, order creation with coupon reservation, **the single fulfilment path** |
| `src/lib/access.ts` | Who may start a session and what it costs |
| `src/lib/settings.ts` | Settings store; provider secrets encrypted with AES-256-GCM |

### Design decisions worth knowing

**The wallet balance is not a number we store.** It is `SUM(delta)` over an
append-only ledger. A balance therefore cannot drift from its own history,
and every credit that ever moved has a row saying who moved it and why.

**There is exactly one path from money to access** — `fulfilOrder()`. Stripe,
PayPal, Apple Pay, Zelle and manual admin grants all call it. A new provider
cannot invent its own subtly different rules, and idempotency only has to be
proved once.

**Idempotency is enforced by the database, not by check-then-write.** Three
unique indexes do the work:
- `credit_ledger(sessionId) WHERE reason='session_use'` — one session can
  never cost two credits, whatever races or double-clicks occur.
- `credit_ledger(orderId, reason)` — a webhook delivered five times grants
  once.
- `orders(paymentMethod, providerTransactionId)` — one provider charge
  cannot be applied to two orders.

**Coupons are reserved at order creation, not counted at fulfilment.** The
redemption row and the counter bump commit together under an IMMEDIATE write
lock, so two simultaneous checkouts cannot both claim the last use of a
one-use code. Cancelling or expiring an order releases the reservation.

**Money is integer cents everywhere.** No floats in the schema or the code.

**Prices are never taken from the browser.** `quote()` is the only pricing
function and both the checkout preview and order creation call it, so the
number shown is by construction the number charged.

## Verified, not assumed

38 tests pass (`npm test`), including the acceptance criteria from the brief:

- $5 → exactly 1 credit. $25 → exactly 6 credits. $40 → 30 days unlimited.
- A fulfilment replayed 5× grants once.
- One session deducts exactly one credit; a resubmitted start deducts none.
- Zero credits + no membership → session refused, balance never negative.
- Unlimited members are never charged.
- Percentage, fixed and bonus-credit coupons; expired, unknown, ineligible,
  over-limit and already-used coupons all rejected with the right reason.
- Coupon total-redemption and per-user limits hold; cancelling releases.
- Zelle grants nothing until an admin approves, and nothing ever on reject.
- Ledger `balanceAfter` agrees with the running sum at every row.
- Secrets round-trip encrypted, are never stored in plaintext, and fail
  closed if the ciphertext is tampered with.
- A payment method with missing credentials is never offered at checkout.

Two real bugs were caught by these tests during the build:
1. The ledger classified *any* constraint failure as "already applied", so a
   foreign-key or CHECK violation would have looked like a successful no-op.
   Narrowed to UNIQUE only.
2. Buying **credits** flipped the legacy `paymentStatus = PAID` flag, which
   granted permanent unlimited access and meant purchased credits were never
   spent. Now only an unlimited purchase sets it. Regression test added.

## Business-rule conflict that needs your decision

The brief says: *"If a user has no credits and does not have active unlimited
access, prevent the session from starting and send the user to the pricing
page."*

The site already has a **free tier** — 50 questions / 65 min, 3 sessions a
day — which the homepage and pricing page advertise. As built, access
resolves in this order:

1. Unlimited membership → full access, no charge
2. Legacy `paymentStatus = PAID` → full access, no charge *(protects your
   existing paying customers, who predate credits)*
3. Credits ≥ 1 → full access, one credit charged
4. Otherwise → **free tier and its daily limit**, then blocked

So a user with zero credits still gets the advertised free trial rather than
a hard paywall. That is the non-breaking reading. If you want credits to be
mandatory, step 4 becomes a hard block — a one-line change, but it removes
the free trial the marketing promises. Tell me which you want.

## Not built yet — in dependency order

1. **Checkout UI + wallet UI** (`/pricing` → product select → coupon → method
   → result; dashboard "My Credits" / "My Membership" / "Payments").
2. **Zelle order flow on the new orders table** — the existing payment-proof
   upload and admin approve/reject screen need repointing at `orders`.
3. **Admin screens**: products, coupons, orders, payment settings, manual
   credit/membership controls with mandatory reason + audit entry.
4. **Stripe** — Checkout Session creation, webhook signature verification,
   `payment_events` recording, then `fulfilOrder()`. Apple Pay rides on this.
5. **PayPal** — order create/capture, webhook verification, then
   `fulfilOrder()`.
6. **Refund/dispute handling** and the reporting views.

Steps 4 and 5 can be written but **cannot be verified end to end without
live API credentials and a public webhook URL**. I will not report them as
working on the strength of code that has never seen a real event.

## Operational note

`SETTINGS_ENCRYPTION_KEY` should be set in production (it falls back to
`JWT_SECRET`). If it ever changes, stored provider secrets become
unreadable and must be re-entered — that is the intended failure mode, not a
bug.
