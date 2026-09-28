const db = require("../db");

async function isBlocked(a, b, database = db) {
  return !!await database.prepare("SELECT 1 FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)").get(a, b, b, a);
}

module.exports = { isBlocked };
