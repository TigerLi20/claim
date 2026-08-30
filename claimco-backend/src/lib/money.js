const CUT_RATE = Number(process.env.PLATFORM_CUT_RATE ?? 0);

/**
 * Splits a task's total price into what the platform keeps and what the
 * worker is paid. The platform cut has been removed, so the worker receives
 * the full task total.
 */
function splitPayment(priceCents) {
  const platformCutCents = 0;
  const workerPayoutCents = priceCents;
  return { platformCutCents, workerPayoutCents, cutRate: CUT_RATE };
}

module.exports = { splitPayment, CUT_RATE };
