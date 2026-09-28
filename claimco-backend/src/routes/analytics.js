const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestamp = (date = new Date()) => date.toISOString().slice(0, 19).replace("T", " ");
const percent = (part, whole) => whole ? Math.round(part / whole * 1000) / 10 : 0;

// These counters contain no email, user ID, search phrase, or item ID.
router.post("/item-view", async (_req, res) => {
  const day = new Date().toISOString().slice(0, 10);
  await db.prepare("INSERT INTO analytics_daily (id, item_views) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET item_views = analytics_daily.item_views + 1").run(day);
  res.status(204).end();
});

router.post("/search-sessions", async (req, res) => {
  if (!uuidPattern.test(req.body?.id || "")) return res.status(400).json({ error: "Invalid search session" });
  await db.prepare("INSERT INTO analytics_search_sessions (id, created_at) VALUES (?, ?) ON CONFLICT(id) DO NOTHING").run(req.body.id, timestamp());
  res.status(204).end();
});

router.post("/search-sessions/:id/opened", async (req, res) => {
  if (!uuidPattern.test(req.params.id)) return res.status(400).json({ error: "Invalid search session" });
  await db.prepare("INSERT INTO analytics_search_sessions (id, created_at, item_opened) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET item_opened = 1").run(req.params.id, timestamp());
  res.status(204).end();
});

router.get("/summary", requireAuth, async (req, res) => {
  const admins = (process.env.ANALYTICS_ADMIN_EMAILS || "tiger_li@brown.edu").split(",").map(email => email.trim().toLowerCase()).filter(Boolean);
  const user = await db.prepare("SELECT email, status FROM users WHERE id = ?").get(req.userId);
  if (!user || user.status !== "active" || !admins.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Analytics access is restricted" });
  }

  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const monthStart = `${month}-01 00:00:00`;
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10) + " 00:00:00";
  const meta = await db.prepare("SELECT started_at FROM analytics_meta WHERE id = 1").get();
  const trackingStart = String(meta?.started_at || monthStart);
  const inquiryStart = trackingStart > monthStart ? trackingStart : monthStart;

  const accounts = Number((await db.prepare("SELECT COUNT(*) AS count FROM users WHERE status = 'active'").get()).count);
  const listingRow = await db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold FROM items").get();
  const listings = Object.fromEntries(["total", "available", "pending", "sold"].map(key => [key, Number(listingRow[key] || 0)]));
  listings.soldPercent = percent(listings.sold, listings.total);

  const gmv = Number((await db.prepare("SELECT COALESCE(SUM(price_cents), 0) AS cents FROM items WHERE status = 'sold' AND sold_at >= ? AND sold_at < ?").get(monthStart, nextMonthStart)).cents);
  // An untouched search is counted as an exit only after 30 minutes; active searches stay out of the rate.
  const searchCutoff = timestamp(new Date(Date.now() - 30 * 60 * 1000));
  const searchRow = await db.prepare("SELECT COUNT(*) AS sessions, SUM(CASE WHEN item_opened = 0 THEN 1 ELSE 0 END) AS exits FROM analytics_search_sessions WHERE created_at >= ? AND created_at < ? AND (item_opened = 1 OR created_at <= ?)").get(monthStart, nextMonthStart, searchCutoff);
  const searchSessions = Number(searchRow.sessions || 0), searchExits = Number(searchRow.exits || 0);
  const itemViews = Number((await db.prepare("SELECT COALESCE(SUM(item_views), 0) AS views FROM analytics_daily WHERE id >= ? AND id < ?").get(month.slice(0, 7) + "-01", nextMonthStart.slice(0, 10))).views);
  const conversationRow = await db.prepare("SELECT COUNT(*) AS count FROM conversations WHERE created_at >= ? AND created_at < ?").get(inquiryStart, nextMonthStart);
  const newConversations = Number(conversationRow.count || 0);
  const avgRow = await db.prepare("SELECT AVG(message_count) AS average FROM (SELECT COUNT(m.id) AS message_count FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id WHERE c.created_at >= ? AND c.created_at < ? GROUP BY c.id) AS counts").get(inquiryStart, nextMonthStart);

  res.json({
    period: { month, timezone: "UTC", trackingStartedAt: trackingStart },
    accounts, listings, estimatedGmvCents: gmv,
    search: { sessions: searchSessions, exits: searchExits, exitRate: percent(searchExits, searchSessions) },
    inquiries: { itemViews, newConversations, rate: percent(newConversations, itemViews), averageMessages: Math.round(Number(avgRow.average || 0) * 10) / 10 },
  });
});

module.exports = router;
