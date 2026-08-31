const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { canAccessConversation } = require("../lib/conversations");

const router = express.Router();

function participantWhere(userId) {
    return "c.user_a_id = ? OR c.user_b_id = ?";
}

router.get("/", requireAuth, async (req, res) => {
    const rows = await db.prepare(`
        SELECT c.id, c.user_a_id, c.user_b_id, c.created_at,
            CASE WHEN c.user_a_id = ? THEN c.user_b_id ELSE c.user_a_id END AS other_id,
            u.name AS other_name, u.year AS other_year, u.concentration AS other_concentration,
            u.profile_image AS other_profile_image,
            m.body AS last_message, m.created_at AS last_message_at
            , (SELECT COUNT(*) FROM messages unread WHERE unread.conversation_id = c.id AND unread.sender_id != ? AND unread.read_at IS NULL) AS unread_count
        FROM conversations c
        JOIN users u ON u.id = CASE WHEN c.user_a_id = ? THEN c.user_b_id ELSE c.user_a_id END
        LEFT JOIN messages m ON m.id = (
            SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC, id DESC LIMIT 1
        )
                WHERE (${participantWhere("?")})
                    AND (
                        EXISTS (SELECT 1 FROM tasks t WHERE t.status IN ('claimed', 'done') AND ((t.requester_id = c.user_a_id AND t.worker_id = c.user_b_id) OR (t.requester_id = c.user_b_id AND t.worker_id = c.user_a_id)))
                        OR EXISTS (SELECT 1 FROM service_purchases p JOIN services s ON s.id = p.service_id WHERE p.confirmation_status = 'confirmed' AND ((p.buyer_id = c.user_a_id AND s.provider_id = c.user_b_id) OR (p.buyer_id = c.user_b_id AND s.provider_id = c.user_a_id)))
                    )
        ORDER BY COALESCE(m.created_at, c.created_at) DESC
    `).all(req.userId, req.userId, req.userId, req.userId, req.userId);
    res.json(rows.map((row) => ({
        id: row.id,
        otherUser: { id: row.other_id, name: row.other_name, year: row.other_year || "", concentration: row.other_concentration || "", profileImage: row.other_profile_image || null },
        lastMessage: row.last_message || "No messages yet.",
        unreadCount: row.unread_count,
        createdAt: row.last_message_at || row.created_at,
    })));
});

router.get("/:id/messages", requireAuth, async (req, res) => {
    if (!await canAccessConversation(req.params.id, req.userId)) return res.status(404).json({ error: "Conversation not found" });
    const conversation = await db.prepare("SELECT user_a_id, user_b_id FROM conversations WHERE id = ?").get(req.params.id);
    const otherUserId = conversation.user_a_id === req.userId ? conversation.user_b_id : conversation.user_a_id;
    const otherUser = await db.prepare("SELECT id, name, year, concentration, profile_image FROM users WHERE id = ?").get(otherUserId);
    const messages = await db.prepare("SELECT id, conversation_id, sender_id, body, read_at, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC").all(req.params.id);
    res.json({
        otherUser: { id: otherUser.id, name: otherUser.name, year: otherUser.year || "", concentration: otherUser.concentration || "", profileImage: otherUser.profile_image || null },
        messages: messages.map((message) => ({ id: message.id, conversationId: message.conversation_id, senderId: message.sender_id, body: message.body, createdAt: message.created_at })),
    });
});

router.post("/:id/read", requireAuth, async (req, res) => {
    if (!await canAccessConversation(req.params.id, req.userId)) return res.status(404).json({ error: "Conversation not found" });
    await db.prepare("UPDATE messages SET read_at = datetime('now') WHERE conversation_id = ? AND sender_id != ? AND read_at IS NULL").run(req.params.id, req.userId);
    res.json({ ok: true });
});

module.exports = router;
