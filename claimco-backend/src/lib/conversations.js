const db = require("../db");

function getConversationId(userAId, userBId, database = db) {
    const [firstId, secondId] = [userAId, userBId].sort();
    if (!process.env.DATABASE_URL) {
        const existing = database.prepare("SELECT id FROM conversations WHERE user_a_id = ? AND user_b_id = ?").get(firstId, secondId);
        if (existing) return existing.id;
        try {
            return database.prepare("INSERT INTO conversations (user_a_id, user_b_id) VALUES (?, ?)").run(firstId, secondId).lastInsertRowid;
        } catch (error) {
            if (!String(error.message).includes("UNIQUE")) throw error;
            return database.prepare("SELECT id FROM conversations WHERE user_a_id = ? AND user_b_id = ?").get(firstId, secondId).id;
        }
    }
    return (async () => {
        const existing = await database.prepare("SELECT id FROM conversations WHERE user_a_id = ? AND user_b_id = ?").get(firstId, secondId);
        if (existing) return existing.id;
        try {
            return (await database.prepare("INSERT INTO conversations (user_a_id, user_b_id) VALUES (?, ?)").run(firstId, secondId)).lastInsertRowid;
        } catch (error) {
            if (!String(error.message).includes("UNIQUE")) throw error;
            return (await database.prepare("SELECT id FROM conversations WHERE user_a_id = ? AND user_b_id = ?").get(firstId, secondId)).id;
        }
    })();
}

function canAccessConversation(conversationId, userId, database = db) {
    const sql = `
                SELECT c.id
                FROM conversations c
                WHERE c.id = ?
                    AND (c.user_a_id = ? OR c.user_b_id = ?)
                    AND (
                        EXISTS (SELECT 1 FROM tasks t WHERE t.status IN ('claimed', 'done') AND ((t.requester_id = c.user_a_id AND t.worker_id = c.user_b_id) OR (t.requester_id = c.user_b_id AND t.worker_id = c.user_a_id)))
                        OR EXISTS (SELECT 1 FROM service_purchases p JOIN services s ON s.id = p.service_id WHERE p.confirmation_status = 'confirmed' AND ((p.buyer_id = c.user_a_id AND s.provider_id = c.user_b_id) OR (p.buyer_id = c.user_b_id AND s.provider_id = c.user_a_id)))
                    )
        `;
    if (!process.env.DATABASE_URL) return !!database.prepare(sql).get(conversationId, userId, userId);
    return database.prepare(sql).get(conversationId, userId, userId).then((row) => !!row);
}

module.exports = { getConversationId, canAccessConversation };
