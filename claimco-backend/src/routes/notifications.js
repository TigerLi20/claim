const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
  const rows = await db.prepare(`
    SELECT n.*, a.name AS actor_name, t.title AS task_title,
      t.requester_id AS task_requester_id, t.worker_id AS task_worker_id,
      t.requester_anonymous, t.worker_anonymous, s.title AS service_title,
      ta.id AS application_id, ta.status AS application_status,
      sp.confirmation_status AS purchase_confirmation_status,
      sp.request_note AS request_note,
      c.id AS conversation_id
    FROM notifications n
    LEFT JOIN users a ON a.id = n.actor_id
    LEFT JOIN tasks t ON t.id = n.task_id
    LEFT JOIN services s ON s.id = n.service_id
    LEFT JOIN task_applications ta ON ta.task_id = n.task_id AND ta.worker_id = n.actor_id AND ta.status = 'pending'
    LEFT JOIN service_purchases sp ON sp.id = n.purchase_id
    LEFT JOIN conversations c ON (c.user_a_id = n.recipient_id AND c.user_b_id = n.actor_id) OR (c.user_a_id = n.actor_id AND c.user_b_id = n.recipient_id)
    WHERE n.recipient_id = ? ORDER BY n.created_at DESC, n.id DESC
  `).all(req.userId);
  res.json(rows.map((row) => ({
    id: row.id, type: row.type, taskId: row.task_id, serviceId: row.service_id,
    purchaseId: row.purchase_id, conversationId: row.conversation_id, applicationId: row.application_id, actorId: row.actor_id, actorName: row.actor_name,
    applicationStatus: row.application_status, purchaseConfirmationStatus: row.purchase_confirmation_status,
    requestNote: row.request_note || "",
    taskTitle: row.task_title, serviceTitle: row.service_title,
    partnerName: row.task_id
      ? ((row.actor_id === row.task_worker_id && row.worker_anonymous) || (row.actor_id === row.task_requester_id && row.requester_anonymous) ? "Anonymous" : row.actor_name)
      : row.actor_name,
    message: row.message, read: !!row.read_at, createdAt: row.created_at,
  })));
});

router.post("/:id/read", requireAuth, async (req, res) => {
  await db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND recipient_id = ?").run(req.params.id, req.userId);
  res.json({ ok: true });
});

module.exports = router;