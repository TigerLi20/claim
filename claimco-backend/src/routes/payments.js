const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const stripeLib = require("../lib/stripe");

const router = express.Router();

// POST /payments/connect/onboard — a user who wants to earn as a worker
// starts (or resumes) Stripe Connect onboarding. The frontend should send
// the returned onboardingUrl to the browser to complete identity + payout
// details entirely on Stripe's hosted flow — none of that sensitive data
// ever touches this server.
router.post("/connect/onboard", requireAuth, async (req, res) => {
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  const { accountId, onboardingUrl, mock } = await stripeLib.startConnectOnboarding(user);

  await db.prepare("UPDATE users SET stripe_account_id = ? WHERE id = ?").run(accountId, user.id);

  res.json({ onboardingUrl, mock });
});

// POST /payments/connect/mark-onboarded — dev-only shortcut used because we
// can't hit Stripe's real onboarding flow (or its webhook) from this
// environment. In production, a `account.updated` webhook event with
// `charges_enabled: true` is what should flip this flag, not a client call.
router.post("/connect/mark-onboarded", requireAuth, async (req, res) => {
  await db.prepare("UPDATE users SET stripe_onboarded = 1 WHERE id = ?").run(req.userId);
  res.json({ ok: true });
});

module.exports = router;
