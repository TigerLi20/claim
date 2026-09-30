const db = require("../db");

// A seller can set auto_reply_text directly in the database. One automatic
// message is allowed per item conversation, even if two buyer messages race.
async function createAutoReply(conversationId, senderId, database = db) {
    const conversation = await database.prepare(
        `SELECT i.seller_id, u.auto_reply_text
         FROM conversations c
         JOIN items i ON i.id = c.item_id
         JOIN users u ON u.id = i.seller_id AND u.status = 'active'
         WHERE c.id = ?`
    ).get(conversationId);
    if (!conversation || conversation.seller_id === senderId) return null;

    const body = typeof conversation.auto_reply_text === "string" ? conversation.auto_reply_text.trim() : "";
    if (!body || body.length > 1000) return null;

    // An existing personal answer takes precedence if this setting is enabled
    // after a conversation has already started.
    const sellerMessage = await database.prepare(
        "SELECT id FROM messages WHERE conversation_id = ? AND sender_id = ? LIMIT 1"
    ).get(conversationId, conversation.seller_id);
    if (sellerMessage) return null;

    const result = await database.prepare(
        "INSERT INTO messages (conversation_id, sender_id, body, is_auto_reply) VALUES (?, ?, ?, 1) ON CONFLICT DO NOTHING"
    ).run(conversationId, conversation.seller_id, body);
    if (!result.changes) return null;

    return {
        id: result.lastInsertRowid,
        conversationId,
        senderId: conversation.seller_id,
        body,
        isAutoReply: true,
        createdAt: new Date().toISOString(),
    };
}

module.exports = { createAutoReply };
