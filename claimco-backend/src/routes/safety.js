const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const rateLimiter = require("../lib/rateLimiter");

const router = express.Router();
const reasons = ["spam", "harassment", "scam", "prohibited-item", "other"];

router.post("/reports", requireAuth, async (req, res) => {
  const { targetType, targetId, reason, details = "" } = req.body || {};
  if (!["user", "item", "message"].includes(targetType) || !targetId || !reasons.includes(reason) || typeof details !== "string" || details.length > 2000) {
    return res.status(400).json({ error: "Choose a valid report target and reason; details may be up to 2000 characters." });
  }
  const queries = {
    user: "SELECT id FROM users WHERE id = ? AND status = 'active'",
    item: "SELECT id FROM items WHERE id = ?",
    message: "SELECT id FROM messages WHERE id = ?",
  };
  if (!await db.prepare(queries[targetType]).get(targetId)) return res.status(404).json({ error: "Content not found" });
  const reportKey = `report:${req.userId}`;
  if (!rateLimiter.check(reportKey, 10, 60 * 60 * 1000).allowed) return res.status(429).json({ error: "Too many reports. Try again later." });
  rateLimiter.record(reportKey);
  const id = randomUUID();
  await db.prepare("INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?, ?)").run(id, req.userId, targetType, String(targetId), reason, details.trim());
  res.status(201).json({ id, message: "Report received. We will review it." });
});

router.get("/blocks", requireAuth, async (req, res) => {
  const rows = await db.prepare("SELECT u.id, u.name FROM user_blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = ? ORDER BY b.created_at DESC").all(req.userId);
  res.json(rows);
});

router.put("/blocks/:userId", requireAuth, async (req, res) => {
  const target = req.params.userId;
  if (target === req.userId) return res.status(400).json({ error: "You cannot block yourself" });
  if (!await db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active'").get(target)) return res.status(404).json({ error: "User not found" });
  await db.prepare("INSERT INTO user_blocks (blocker_id, blocked_id) VALUES (?, ?) ON CONFLICT (blocker_id, blocked_id) DO NOTHING").run(req.userId, target);
  res.json({ ok: true });
});

router.delete("/blocks/:userId", requireAuth, async (req, res) => {
  await db.prepare("DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?").run(req.userId, req.params.userId);
  res.json({ ok: true });
});

router.get("/reports", requireAuth, async (req, res) => {
  const adminEmail = process.env.REPORT_ADMIN_EMAIL || "tiger_li@brown.edu";
  const user = await db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId);
  if (!adminEmail || user?.email?.toLowerCase() !== adminEmail.toLowerCase()) return res.status(403).json({ error: "Forbidden" });
  const rows = await db.prepare("SELECT * FROM reports ORDER BY CASE WHEN status = 'open' THEN 0 ELSE 1 END, created_at DESC LIMIT 200").all();
  res.json(rows);
});

router.patch("/reports/:id", requireAuth, async (req, res) => {
  const adminEmail = process.env.REPORT_ADMIN_EMAIL || "tiger_li@brown.edu";
  const user = await db.prepare("SELECT email FROM users WHERE id = ?").get(req.userId);
  if (!adminEmail || user?.email?.toLowerCase() !== adminEmail.toLowerCase()) return res.status(403).json({ error: "Forbidden" });
  if (!["reviewed", "closed"].includes(req.body?.status)) return res.status(400).json({ error: "Invalid status" });
  const result = await db.prepare("UPDATE reports SET status = ?, reviewed_at = datetime('now') WHERE id = ?").run(req.body.status, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Report not found" });
  res.json({ ok: true });
});

module.exports = router;
