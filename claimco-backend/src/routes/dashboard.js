const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { CUT_RATE } = require("../lib/money");

const router = express.Router();

function getDashboardStatsForUser(userId, database = db) {
  const totals = database
    .prepare(
      `SELECT
         COUNT(CASE WHEN requester_id = ? AND status != 'cancelled' THEN 1 END) AS posted_count,
         COUNT(CASE WHEN requester_id = ? AND status = 'open' THEN 1 END) AS open_count,
         COUNT(CASE WHEN requester_id = ? AND status = 'claimed' THEN 1 END) AS claimed_count,
         COUNT(CASE WHEN worker_id = ? AND status = 'done' THEN 1 END) AS done_count,
         COALESCE(SUM(CASE WHEN worker_id = ? AND status = 'done' THEN price_cents ELSE 0 END), 0) AS earned_cents
       FROM tasks
       WHERE requester_id = ? OR worker_id = ?`
    )
    .get(userId, userId, userId, userId, userId, userId, userId);

  const tutoring = database
    .prepare(
      `SELECT
         COUNT(DISTINCT s.id) AS offered_count,
         COUNT(CASE WHEN p.confirmation_status = 'confirmed' AND p.provider_completed = 1 AND p.buyer_completed = 1 THEN 1 END) AS fulfilled_count,
         COALESCE(SUM(CASE WHEN p.confirmation_status = 'confirmed' AND p.provider_completed = 1 AND p.buyer_completed = 1 THEN p.price_cents ELSE 0 END), 0) AS earned_cents
       FROM services s
       LEFT JOIN service_purchases p ON p.service_id = s.id AND p.confirmation_status = 'confirmed' AND p.provider_completed = 1 AND p.buyer_completed = 1
       WHERE s.provider_id = ?`
    )
    .get(userId);

  return {
    cutRate: CUT_RATE,
    postedCount: Number(totals.posted_count || 0),
    earned: Number((totals.earned_cents || 0) / 100),
    openCount: Number(totals.open_count || 0),
    claimedCount: Number(totals.claimed_count || 0),
    doneCount: Number(totals.done_count || 0),
    fulfilledCount: Number(totals.done_count || 0),
    tutoringOfferedCount: Number(tutoring.offered_count || 0),
    tutoringFulfilledCount: Number(tutoring.fulfilled_count || 0),
    tutoringEarned: Number((tutoring.earned_cents || 0) / 100),
  };
}

// GET /dashboard/stats — per-account snapshot for the authenticated user.
router.get("/stats", requireAuth, (req, res) => {
  res.json(getDashboardStatsForUser(req.userId));
});

module.exports = router;
module.exports.getDashboardStatsForUser = getDashboardStatsForUser;
