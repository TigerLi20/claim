# Claim — frontend

A real, running app (not a mockup) that talks to the `claimco-backend` API.
Register/log in, browse the board, post tasks, claim and fulfill them, and
discover tutoring offers from peers and campus helpers. The product is tuned
around a modern tutoring-first marketplace: students can request help, offer
sessions, and complete both one-off tasks and recurring academic support.

## Setup

This expects the backend to already be running on `http://localhost:3001` by
default.
(see `claimco-backend/README.md`). Put this folder **next to** that one, not
inside it:

```
some-folder/
  claimco-backend/
  claimco-frontend/
```

Then:

```bash
cd claimco-frontend
npm install
npm run dev
```

It'll print a local URL, usually `http://localhost:5173` — open that in your
browser.

If your backend runs on a different port or host, set `VITE_API_BASE` before
starting Vite, for example `VITE_API_BASE=http://localhost:3011 npm run dev`.

## Pages

- `/login` — register or log in (shown automatically if you're not signed in)
- `/board` — every open/claimed/fulfilled task and marketplace update
- `/post` — post a new task or request
- `/mine` — tasks you've posted or claimed, plus tutoring offers and sessions
- `/dashboard` — platform-wide stats (total value, platform cut, worker payout)
- `/services` — browse active tutoring offers and help listings
- `/offer` — publish a tutoring offer

## How auth works here

The login token is stored in the browser's `localStorage` so you stay logged
in across refreshes — open two different browsers (or one regular + one
incognito window) to act as two different users at once, e.g. one posting a
task and the other claiming it, which is the easiest way to see the full
loop with your own hands instead of curl.

## Design

Reused the same "claim ticket" visual language from the first prototype —
kraft paper background, ticket-stub cards, rubber-stamp status badges. All of
it lives in `src/styles.css` as plain CSS variables and classes, so it's easy
to restyle later without touching any component logic.

## What's next

- Expand the tutoring experience with clearer categories, scheduling, and
  profile-based trust signals for tutors and helpers
- Wire in Stripe.js on the `/post` page to actually collect a card, instead
  of the backend's mocked payment hold
- Add the Stripe Connect onboarding flow to a profile/settings page so
  workers can actually get paid (the backend endpoint already exists:
  `POST /payments/connect/onboard`)
- Polish the visual design once the flows themselves feel right
