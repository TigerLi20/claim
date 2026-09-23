const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { canAccessConversation } = require("../lib/conversations");
const router = express.Router();
router.get("/", requireAuth, async (req, res) => {
  const rows = await db.prepare(`SELECT c.id, c.item_id, i.title AS item_title, i.status AS item_status, c.created_at,
    CASE WHEN c.user_a_id = ? THEN c.user_b_id ELSE c.user_a_id END AS other_id,
    u.name AS other_name, u.year AS other_year, u.concentration AS other_concentration,
    u.profile_image AS other_profile_image,
    m.body AS last_message, m.created_at AS last_message_at,
    (SELECT COUNT(*) FROM messages unread WHERE unread.conversation_id = c.id AND unread.sender_id != ? AND unread.read_at IS NULL) AS unread_count
    FROM conversations c JOIN items i ON i.id = c.item_id
    JOIN users u ON u.id = CASE WHEN c.user_a_id = ? THEN c.user_b_id ELSE c.user_a_id END
    LEFT JOIN messages m ON m.id = (SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, id DESC LIMIT 1)
    WHERE c.user_a_id = ? OR c.user_b_id = ? ORDER BY COALESCE(m.created_at, c.created_at) DESC`).all(req.userId, req.userId, req.userId, req.userId, req.userId);
  res.json(rows.map(row => ({ id: row.id, item: { id: row.item_id, title: row.item_title, status: row.item_status }, otherUser: { id: row.other_id, name: row.other_name, year: row.other_year || "", concentration: row.other_concentration || "", profileImage: row.other_profile_image || null }, lastMessage: row.last_message || "No messages yet.", unreadCount: Number(row.unread_count), createdAt: row.last_message_at || row.created_at })));
});
router.get("/:id/messages", requireAuth, async (req, res) => {
  if (!await canAccessConversation(req.params.id, req.userId)) return res.status(404).json({ error: "Conversation not found" });
  const c = await db.prepare("SELECT c.*, i.title AS item_title, i.status AS item_status FROM conversations c JOIN items i ON i.id = c.item_id WHERE c.id = ?").get(req.params.id);
  const other = await db.prepare("SELECT id, name, year, concentration, profile_image FROM users WHERE id = ?").get(c.user_a_id === req.userId ? c.user_b_id : c.user_a_id);
  const messages = await db.prepare("SELECT id, conversation_id, sender_id, body, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at, id").all(req.params.id);
  res.json({ item: { id: c.item_id, title: c.item_title, status: c.item_status }, otherUser: { id: other.id, name: other.name, year: other.year || "", concentration: other.concentration || "", profileImage: other.profile_image || null }, messages: messages.map(m => ({ id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, body: m.body, createdAt: m.created_at })) });
});
router.post("/:id/read", requireAuth, async (req, res) => {
  if (!await canAccessConversation(req.params.id, req.userId)) return res.status(404).json({ error: "Conversation not found" });
  await db.prepare("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL").run(req.params.id, req.userId);
  res.json({ ok: true });
});
module.exports = router;
