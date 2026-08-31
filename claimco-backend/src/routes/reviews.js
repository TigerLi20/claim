const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

async function getTaskTarget(id, reviewerId) {
    const task = await db.prepare("SELECT id, title, status, requester_id, worker_id FROM tasks WHERE id = ?").get(id);
    if (!task || task.status !== "done" || !task.worker_id) return null;
    if (![task.requester_id, task.worker_id].includes(reviewerId)) return null;
    const revieweeId = task.requester_id === reviewerId ? task.worker_id : task.requester_id;
    return { kind: "task", taskId: task.id, title: task.title, revieweeId };
}

async function getServiceTarget(id, reviewerId) {
    const purchase = await db.prepare(`
        SELECT p.id, p.buyer_id, p.provider_completed, p.buyer_completed, p.confirmation_status,
            s.title, s.provider_id
        FROM service_purchases p
        JOIN services s ON s.id = p.service_id
        WHERE p.id = ?
    `).get(id);
    if (!purchase || purchase.confirmation_status !== "confirmed" || !purchase.provider_completed || !purchase.buyer_completed) return null;
    if (![purchase.buyer_id, purchase.provider_id].includes(reviewerId)) return null;
    const revieweeId = purchase.buyer_id === reviewerId ? purchase.provider_id : purchase.buyer_id;
    return { kind: "service", purchaseId: purchase.id, title: purchase.title, revieweeId };
}

async function getTarget(kind, id, reviewerId) {
    return kind === "task" ? getTaskTarget(id, reviewerId) : getServiceTarget(id, reviewerId);
}

async function serializeTarget(target, reviewerId) {
    const existing = await db.prepare(`
        SELECT r.id, r.rating, r.body, r.anonymous, r.created_at, u.id AS reviewee_id, u.name AS reviewee_name,
            u.year AS reviewee_year, u.concentration AS reviewee_concentration, u.profile_image AS reviewee_profile_image
        FROM reviews r JOIN users u ON u.id = r.reviewee_id
        WHERE r.reviewer_id = ? AND ${target.kind === "task" ? "r.task_id = ?" : "r.purchase_id = ?"}
    `).get(reviewerId, target.kind === "task" ? target.taskId : target.purchaseId);
    return {
        ...target,
        reviewee: {
            id: target.revieweeId,
            name: existing?.reviewee_name || (await db.prepare("SELECT name FROM users WHERE id = ?").get(target.revieweeId)).name,
            year: existing?.reviewee_year || "",
            concentration: existing?.reviewee_concentration || "",
            profileImage: existing?.reviewee_profile_image || null,
        },
        review: existing ? { id: existing.id, rating: existing.rating, body: existing.body, anonymous: !!existing.anonymous, createdAt: existing.created_at } : null,
    };
}

router.get("/:kind/:id", requireAuth, async (req, res) => {
    if (!["task", "service"].includes(req.params.kind)) return res.status(404).json({ error: "Review target not found" });
    const target = await getTarget(req.params.kind, req.params.id, req.userId);
    if (!target) return res.status(403).json({ error: "Reviews are available only to participants after full fulfillment" });
    res.json(await serializeTarget(target, req.userId));
});

router.post("/:kind/:id", requireAuth, async (req, res) => {
    if (!["task", "service"].includes(req.params.kind)) return res.status(404).json({ error: "Review target not found" });
    const target = await getTarget(req.params.kind, req.params.id, req.userId);
    if (!target) return res.status(403).json({ error: "Reviews are available only to participants after full fulfillment" });

    const rating = Number(req.body?.rating);
    const body = String(req.body?.body || "").trim();
    const anonymous = req.body?.anonymous ? 1 : 0;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: "rating must be a whole number from 1 to 5" });
    if (body.length > 1000) return res.status(400).json({ error: "Review must be 1000 characters or fewer" });

    const existing = await db.prepare(`SELECT id FROM reviews WHERE reviewer_id = ? AND ${target.kind === "task" ? "task_id = ?" : "purchase_id = ?"}`).get(req.userId, target.kind === "task" ? target.taskId : target.purchaseId);
    if (existing) return res.status(409).json({ error: "You already reviewed this completed relationship" });

    const id = crypto.randomUUID();
    await db.prepare(`
        INSERT INTO reviews (id, task_id, purchase_id, reviewer_id, reviewee_id, rating, body, anonymous)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, target.kind === "task" ? target.taskId : null, target.kind === "service" ? target.purchaseId : null, req.userId, target.revieweeId, rating, body, anonymous);
    res.status(201).json({ id, rating, body, anonymous: !!anonymous });
});

module.exports = router;
