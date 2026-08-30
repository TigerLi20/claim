const crypto = require("crypto");

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = STRIPE_KEY ? require("stripe")(STRIPE_KEY) : null;
const MOCK = !stripe;

if (MOCK) {
  console.log(
    "[stripe] No STRIPE_SECRET_KEY set — running in mock mode. " +
      "Payment calls are simulated and logged instead of hitting the real Stripe API."
  );
}

function mockId(prefix) {
  return `${prefix}_mock_${crypto.randomBytes(8).toString("hex")}`;
}

/**
 * Creates (once) a Stripe Express connected account for a user who wants to
 * get paid as a worker, and returns an onboarding link they open to add
 * their bank details / identity info.
 */
async function startConnectOnboarding(user) {
  if (MOCK) {
    const accountId = user.stripe_account_id || mockId("acct");
    return {
      accountId,
      onboardingUrl: `https://example.com/mock-stripe-onboarding/${accountId}`,
      mock: true,
    };
  }

  let accountId = user.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: {
        transfers: { requested: true },
      },
    });
    accountId = account.id;
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: process.env.STRIPE_REFRESH_URL || "https://example.com/onboard/refresh",
    return_url: process.env.STRIPE_RETURN_URL || "https://example.com/onboard/complete",
    type: "account_onboarding",
  });

  return { accountId, onboardingUrl: accountLink.url, mock: false };
}

/**
 * Authorizes (holds) the requester's payment when a task is posted, without
 * capturing it yet. Funds move only once the ticket is marked fulfilled.
 * NOTE: this assumes the client has already collected a payment method and
 * passed a Stripe payment_method id — that step isn't implemented in this
 * MVP (see README) since it requires Stripe.js on the frontend.
 */
async function authorizeHold({ amountCents, paymentMethodId, customerEmail }) {
  if (MOCK) {
    return { paymentIntentId: mockId("pi"), status: "requires_capture", mock: true };
  }

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    payment_method: paymentMethodId,
    confirm: true,
    capture_method: "manual",
    receipt_email: customerEmail,
  });

  return { paymentIntentId: intent.id, status: intent.status, mock: false };
}

/**
 * Captures the held payment and transfers the worker's share to their
 * connected Stripe account. The platform's cut simply stays in the platform
 * balance — it's whatever was captured minus what got transferred out.
 */
async function captureAndPayout({ paymentIntentId, workerStripeAccountId, workerPayoutCents }) {
  if (MOCK) {
    return {
      captured: true,
      transferId: mockId("tr"),
      paidToAccount: workerStripeAccountId,
      amountCents: workerPayoutCents,
      mock: true,
    };
  }

  await stripe.paymentIntents.capture(paymentIntentId);

  const transfer = await stripe.transfers.create({
    amount: workerPayoutCents,
    currency: "usd",
    destination: workerStripeAccountId,
    transfer_group: paymentIntentId,
  });

  return { captured: true, transferId: transfer.id, mock: false };
}

/**
 * Releases a hold if a task is cancelled before it's fulfilled.
 */
async function cancelHold(paymentIntentId) {
  if (MOCK) {
    return { cancelled: true, mock: true };
  }
  await stripe.paymentIntents.cancel(paymentIntentId);
  return { cancelled: true, mock: false };
}

module.exports = {
  MOCK,
  startConnectOnboarding,
  authorizeHold,
  captureAndPayout,
  cancelHold,
};
