const jwt = require("jsonwebtoken");
const db = require("../db");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active'").get(payload.sub);
    if (!user) return res.status(401).json({ error: "Account unavailable" });
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
