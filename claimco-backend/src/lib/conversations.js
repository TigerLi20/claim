const db = require("../db");
const { isBlocked } = require("./blocks");

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
    const row = await database.prepare("SELECT user_a_id, user_b_id FROM conversations WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)").get(conversationId, userId, userId);
    if (!row || await isBlocked(row.user_a_id, row.user_b_id, database)) return false;
    const active = await database.prepare("SELECT COUNT(*) AS total FROM users WHERE id IN (?, ?) AND status = 'active'").get(row.user_a_id, row.user_b_id);
    return Number(active?.total) === 2;
}

module.exports = { getConversationId, canAccessConversation };
