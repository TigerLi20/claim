const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/:id", requireAuth, async (req, res) => {
    const user = await db.prepare(
        "SELECT id, name, year, concentration, about_me, profile_image FROM users WHERE id = ?"
    ).get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const activity = await db.prepare(`
        SELECT
            (SELECT COUNT(*) FROM tasks WHERE requester_id = ?) AS tasks_posted,
            (SELECT COUNT(*) FROM tasks WHERE worker_id = ? AND status = 'done') AS tasks_completed,
            (SELECT COUNT(*) FROM services WHERE provider_id = ?) AS services_offered
    `).get(req.params.id, req.params.id, req.params.id);
    const reviews = await db.prepare(`
        SELECT r.id, r.rating, r.body, r.anonymous, r.created_at, u.id AS reviewer_id, u.name AS reviewer_name
        FROM reviews r JOIN users u ON u.id = r.reviewer_id
        WHERE r.reviewee_id = ? ORDER BY r.created_at DESC
    `).all(req.params.id);

    res.json({
        id: user.id,
        name: user.name,
        year: user.year || "",
        concentration: user.concentration || "",
        aboutMe: user.about_me || "",
        profileImage: user.profile_image || null,
        tasksPosted: activity.tasks_posted,
        tasksCompleted: activity.tasks_completed,
        servicesOffered: activity.services_offered,
        reviewCount: reviews.length,
        averageRating: reviews.length ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length : null,
        reviews: reviews.map((review) => ({
            id: review.id,
            rating: review.rating,
            body: review.body,
            reviewer: { id: review.reviewer_id, name: review.anonymous ? "Anonymous" : review.reviewer_name },
            createdAt: review.created_at,
        })),
    });
});

module.exports = router;