const express = require('express');
const router = express.Router();
const db = require('../db');
const requireAdmin = require('../middleware/requireAdmin');

// POST /api/support — anyone can submit
router.post('/', async (req, res) => {
    const { name, email, message } = req.body;

    if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const stmt = db.prepare(
        `INSERT INTO support_messages (name, email, message) VALUES (?, ?, ?)`
    );
    const info = await stmt.run(name || null, email || null, message.trim());

    res.status(201).json({ id: info.lastInsertRowid, status: 'received' });
});

// GET /api/support/admin — list all messages, newest first
router.get('/admin', requireAdmin, async (req, res) => {
    const rows = await db
        .prepare(`SELECT * FROM support_messages ORDER BY created_at DESC`)
        .all();
    res.json(rows);
});

// PATCH /api/support/admin/:id — mark resolved / unresolved
router.patch('/admin/:id', requireAdmin, async (req, res) => {
    const { resolved } = req.body;
    await db.prepare(`UPDATE support_messages SET resolved = ? WHERE id = ?`).run(
        resolved ? 1 : 0,
        req.params.id
    );
    res.json({ status: 'updated' });
});

module.exports = router;
