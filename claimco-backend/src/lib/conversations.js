const db = require("../db");

async function getConversationId(itemId, userAId, userBId, database = db) {
    const [firstId, secondId] = [userAId, userBId].sort();
    const existing = await database.prepare("SELECT id FROM conversations WHERE item_id = ? AND user_a_id = ? AND user_b_id = ?").get(itemId, firstId, secondId);
    if (existing) return existing.id;
    try {
        const inserted = await database.prepare("INSERT INTO conversations (item_id, user_a_id, user_b_id) VALUES (?, ?, ?)").run(itemId, firstId, secondId);
        return inserted.lastInsertRowid;
    } catch (error) {
        if (!/UNIQUE|unique/i.test(String(error.message))) throw error;
        const raced = await database.prepare("SELECT id FROM conversations WHERE item_id = ? AND user_a_id = ? AND user_b_id = ?").get(itemId, firstId, secondId);
        return raced.id;
    }
}

async function canAccessConversation(conversationId, userId, database = db) {
    return !!await database.prepare("SELECT id FROM conversations WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)").get(conversationId, userId, userId);
}

module.exports = { getConversationId, canAccessConversation };
