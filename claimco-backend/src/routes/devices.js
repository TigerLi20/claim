const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

router.post("/push-token", requireAuth, async (req, res) => {
  const { token, platform } = req.body || {};
  if (typeof token !== "string" || token.length < 20 || token.length > 4096 || !["ios", "android"].includes(platform)) return res.status(400).json({ error: "Invalid push token" });
  await db.prepare("INSERT INTO device_tokens (token, user_id, platform) VALUES (?, ?, ?) ON CONFLICT (token) DO UPDATE SET user_id = ?, platform = ?").run(token, req.userId, platform, req.userId, platform);
  res.json({ ok: true });
});

router.delete("/push-token", requireAuth, async (req, res) => {
  if (typeof req.body?.token === "string") await db.prepare("DELETE FROM device_tokens WHERE token = ? AND user_id = ?").run(req.body.token, req.userId);
  res.json({ ok: true });
});

module.exports = router;
