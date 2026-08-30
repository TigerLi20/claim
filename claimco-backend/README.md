# Claim — backend

Backend for the campus tutoring and task marketplace prototype: students post
small jobs they need done, while tutors and helpers list their availability for
subject support, coaching, and one-off help. The product is designed around
real student-to-student transactions, with tutoring as the more modern and
higher-trust core offer layer.

This has been run end-to-end locally: register → post a task → claim → mark
fulfilled → correct 15% platform / 85% worker split → dashboard stats. See
"What's real vs. mocked" below for the one piece that needs live Stripe keys
to fully complete.

## Stack

- **Express** — HTTP API
- **better-sqlite3** — single-file SQL database, zero setup, easy to swap for
  Postgres later (see "Moving to Postgres" below)
- **bcryptjs** — password hashing
- **jsonwebtoken** — auth tokens
- **stripe** — Connect (worker payouts) + PaymentIntents (holding a
  requester's payment until the ticket is fulfilled)

## Setup

```bash
npm install
cp .env.example .env    # then edit JWT_SECRET at minimum
npm run dev              # http://localhost:3001
```

`GET /health` should return `{"ok":true}`.

## Data model

**users** — one account type. The same person posts tasks sometimes and
claims them other times, same as real campus life. `stripe_account_id` /
`stripe_onboarded` are only set once someone tries to get paid as a worker.

**tasks** — a single ticket. Lifecycle:

```
open ──claim──> claimed ──complete──> done
  │                │
  └────cancel──────┘
             (cancelled)
```

**tutoring offers / services** — an ongoing offer from a tutor or helper,
such as weekly homework support, writing review, resume coaching, or exam prep.
These are separate from tasks because they do not have a single claim or
fulfillment event yet. The current prototype supports publishing, browsing,
pausing, and one-time purchases for tutoring-style sessions and help offers.
Recurring subscriptions are intentionally not part of the current product.

## Money flow

1. **Post** (`POST /tasks`) — the requester's payment is *authorized and held*
   (Stripe's `capture_method: manual`), not yet captured. Nothing has moved
   yet; the funds are just reserved.
2. **Claim** (`POST /tasks/:id/claim`) — just assigns a worker, no money
   moves.
3. **Complete** (`POST /tasks/:id/complete`) — this is the only place money
   actually moves: the hold is **captured**, then a **Stripe Transfer** sends
   the worker's share (85% by default) to their connected account. The
   platform's cut is simply whatever's left in the platform's Stripe balance
   — you never have to calculate or move it yourself.
4. **Cancel** (`POST /tasks/:id/cancel`) — releases the hold if it never got
   fulfilled. No one is charged.

The split percentage lives in one place: `PLATFORM_CUT_RATE` in `.env`
(default `0.15`). Change it there, not in code.

## What's real vs. mocked

Everything runs **fully functionally without any Stripe account** — see
`src/lib/stripe.js`. With no `STRIPE_SECRET_KEY` set, every Stripe call is
replaced with a realistic mock (fake IDs, logged to the console) so you can
build and test the entire task lifecycle today.

To go live, you need to:

1. Get a Stripe account and test-mode secret key, set `STRIPE_SECRET_KEY`.
2. **Collect a real payment method on the frontend.** This backend expects a
   `paymentMethodId` in the `POST /tasks` body — that has to come from
   [Stripe.js / Stripe Elements](https://docs.stripe.com/payments/quickstart)
   running in the browser, which is a small frontend addition, since Stripe
   never lets raw card numbers touch your server.
3. Add a **Stripe webhook** listener for `account.updated` to flip
   `stripe_onboarded` for real, instead of the `POST
   /payments/connect/mark-onboarded` dev shortcut currently in
   `src/routes/payments.js` (that route exists only because this sandbox
   can't reach Stripe's live onboarding flow or webhooks to test against).

## API reference

All endpoints except `/health` and `/auth/*` require `Authorization: Bearer
<token>`.

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | `{ name, email, phoneNumber, year, concentration }` → `{ pendingUserId, message, email }` — creates pending user, sends verification code |
| POST | `/auth/verify-email` | `{ pendingUserId, code }` → `{ token, user }` — activates pending user after verifying 6-digit code |
| POST | `/auth/resend-code` | `{ pendingUserId }` → `{ message, email }` — resends verification code (max 5 per hour) |
| POST | `/auth/login` | `{ email, password }` → `{ token, user }` — login for backward-compatible users |
| GET | `/tasks?status=open` | List active browseable tasks, optionally filtered by status |
| GET | `/tasks/mine` | Tasks you posted or claimed |
| POST | `/tasks` | `{ category, title, description, price, paymentMethodId? }` |
| POST | `/tasks/:id/claim` | Claim an open ticket |
| POST | `/tasks/:id/complete` | Worker marks it fulfilled — triggers payout |
| POST | `/tasks/:id/cancel` | Requester cancels before fulfillment |
| PATCH | `/tasks/:id` | Requester edits an open ticket's category, title, or description |
| POST | `/tasks/:id/reoffer` | Requester edits and republishes a cancelled or fulfilled ticket at the same price; the original remains in My Tickets |
| POST | `/tasks/:id/applications/:applicationId/confirm` | Requester confirms one applicant and declines the others |
| POST | `/tasks/:id/applications/:applicationId/decline` | Requester declines an applicant |
| GET | `/services` | List active tutoring offers and help listings |
| GET | `/services/mine` | Tutoring offers created by the signed-in user |
| POST | `/services` | `{ category, title, description, price, priceUnit }` |
| POST | `/services/:id/deactivate` | Tutor pauses their offer |
| POST | `/services/:id/activate` | Tutor resumes their offer |
| PATCH | `/services/:id` | Tutor edits their offer title or description |
| POST | `/services/:id/reoffer` | Tutor updates and reactivates a paused offer, including its price |
| POST | `/services/:id/purchase` | Buyer makes a one-time tutoring purchase; repurchase is available after 24 hours |
| POST | `/services/:id/customers/:purchaseId/confirm` | Tutor confirms a student claim |
| POST | `/services/:id/customers/:purchaseId/decline` | Tutor declines a student purchase |
| GET | `/tasks/:id` | View a ticket in detail |
| GET | `/services/:id` | View a service in detail |
| GET | `/users/:id` | View a public profile snippet |

Task posts and claims can be anonymous. The database keeps the real account
IDs privately so authorization, cancellation, completion, and payouts still
work; public task responses replace opted-in names with `Anonymous`.
| POST | `/payments/connect/onboard` | Start Stripe Connect onboarding, returns a URL |
| POST | `/payments/connect/mark-onboarded` | **Dev-only** stand-in for the real onboarding webhook |
| GET | `/dashboard/stats` | Platform-wide active-job, completed-job, and gross-earned totals |

`category` must be one of `moveout`, `errand`, `event` (matches the frontend's
three ticket types).

## Restricting signups to campus

Set `ALLOWED_EMAIL_DOMAIN=brown.edu` in `.env` and registration will reject
any non-`@brown.edu` email. This is the cheapest trust lever available before
you build anything fancier like ID verification — worth turning on before
launch.

## Email verification (Brown University only)

New users register via `/auth/register` with `{ name, email, phoneNumber, year, concentration }`.
A 6-digit verification code is sent to their Brown email, and they confirm via
`/auth/verify-email` with `{ pendingUserId, code }`. Only verified users can
log in.

- **Verification codes** expire after 10 minutes
- **Max 5 failed attempts** before code is locked
- **Rate limiting** max 5 code resends per email per hour
- **Abandoned accounts** automatically cleaned up after 15 minutes

### Test identifiers (non-production only)

In development, the following emails use hardcoded verification codes instead
of real email sending (useful for E2E testing):

```
test.student@brown.edu          → 000000
test2.student@brown.edu         → 111111
test3.student@brown.edu         → 222222
```

These only work when `NODE_ENV` is not `production`. In production,
all codes are random 6-digit numbers sent via your configured email service.

### Email sending provider

- **Development** (`NODE_ENV=development`): Uses Ethereal (free test SMTP) with preview links in console output
- **Production** (stub): Currently not implemented; set up SendGrid, SES, or other provider in `src/lib/deliveryProvider.production.js`

## Moving to Postgres later

The only file that knows about SQLite specifically is `src/db/index.js` and
the `datetime('now')` / `CHECK (...)` syntax in `src/db/schema.sql`. When
you're ready for a real host (Render, Railway, Fly, RDS), swap
`better-sqlite3` for `pg`, adjust that one connection file, and translate the
schema's SQLite-specific syntax to Postgres equivalents — the route files
don't need to change since they only call `db.prepare(...).get/all/run(...)`,
which is easy to wrap with an equivalent `pg` helper.

## Wiring up the frontend

The `claim-co-mvp.jsx` frontend currently keeps tasks in React state. To
connect it to this backend: replace the `useState(SEED_TASKS)` calls with
`fetch` calls to these endpoints, and add a login/register screen before the
board (the frontend's "Acting as" name field was a stand-in for real auth —
this backend now has that for real via `/auth`).
