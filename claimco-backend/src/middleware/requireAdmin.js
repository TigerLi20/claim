// Temporary admin gate using shared ADMIN_KEY from .env
function requireAdmin(req, res, next) {
    const key = req.header('x-admin-key');

    if (!process.env.ADMIN_KEY) {
        return res.status(500).json({ error: 'ADMIN_KEY not configured on the server' });
    }

    if (key !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

module.exports = requireAdmin;
