const db = require("../db");

const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const activeUsers = new Map();

function persistOnlineState(userId, onlineStatus) {
    if (!userId || !db || typeof db.prepare !== "function") return Promise.resolve();

    try {
        const stmt = db.prepare("UPDATE users SET online_status = ?, last_seen_at = ? WHERE id = ?");
        return Promise.resolve(stmt.run(onlineStatus, new Date().toISOString(), userId)).catch((error) => {
            console.error("[presence] failed to persist user state:", error);
        });
    } catch (error) {
        console.error("[presence] failed to persist user state:", error);
        return Promise.resolve();
    }
}

async function markUserActive(userId) {
    if (!userId) return;
    const hadActiveUser = activeUsers.has(userId);
    activeUsers.set(userId, Date.now());

    await persistOnlineState(userId, "online");
}

async function markUserInactive(userId) {
    if (!userId) return;
    activeUsers.delete(userId);
    await persistOnlineState(userId, "offline");
}

function isUserActive(userId) {
    if (!userId) return false;
    const lastSeenAt = activeUsers.get(userId);
    if (!lastSeenAt) return false;
    return Date.now() - lastSeenAt < ACTIVE_WINDOW_MS;
}

function shouldSendAwayEmail(userId) {
    return !isUserActive(userId);
}

setInterval(() => {
    const now = Date.now();
    for (const [userId, lastSeenAt] of [...activeUsers.entries()]) {
        if (now - lastSeenAt >= ACTIVE_WINDOW_MS) {
            activeUsers.delete(userId);
            void persistOnlineState(userId, "offline");
        }
    }
}, 60 * 1000);

module.exports = {
    ACTIVE_WINDOW_MS,
    markUserActive,
    markUserInactive,
    isUserActive,
    shouldSendAwayEmail,
};
