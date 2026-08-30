const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const stripeLib = require("../lib/stripe");

const router = express.Router();
const VALID_CATEGORIES = new Set(["academic", "careers", "creative", "other"]);
const MAX_IMAGES = 3;
const MAX_IMAGE_LENGTH = 2000000;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

function parseImages(value) {
    if (value === undefined) return null;
    if (!Array.isArray(value) || value.length > MAX_IMAGES || value.some((image) => typeof image !== "string" || image.length > MAX_IMAGE_LENGTH || !/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image))) {
        throw new Error("Add up to 3 valid images, each no larger than 1.5 MB after compression.");
    }
    return JSON.stringify(value);
}

const SERVICE_SELECT = `
  SELECT s.*, u.name AS provider_name, u.year AS provider_year,
    u.concentration AS provider_concentration, u.profile_image AS provider_profile_image
  FROM services s
  JOIN users u ON u.id = s.provider_id
`;

function serializeService(row) {
    return {
        id: row.id,
        category: row.category,
        title: row.title,
        description: row.description,
        images: JSON.parse(row.images_json || "[]"),
        price: row.price_cents / 100,
        priceUnit: "per booking",
        status: row.status,
        isPurchased: !!row.is_purchased,
        provider: {
            id: row.provider_id,
            name: row.provider_name,
            year: row.provider_year || "",
            concentration: row.provider_concentration || "",
            profileImage: row.provider_profile_image || null,
        },
        createdAt: row.created_at,
    };
}

router.get("/", requireAuth, (req, res) => {
    const rows = db
        .prepare(`${SERVICE_SELECT}
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC`)
        .all();
        const purchased = db.prepare(`
                SELECT p.id, p.service_id, p.confirmation_status, p.provider_completed, p.buyer_completed
                FROM service_purchases p
                WHERE p.buyer_id = ? AND p.confirmation_status != 'declined'
                    AND p.id = (
                        SELECT latest.id FROM service_purchases latest
                        WHERE latest.service_id = p.service_id
                            AND latest.buyer_id = p.buyer_id
                            AND latest.confirmation_status != 'declined'
                        ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1
                    )
        `).all(req.userId);
        const purchaseStates = new Map(purchased.map((purchase) => [purchase.service_id, purchase]));
        res.json(rows.map((row) => {
                const purchase = purchaseStates.get(row.id);
                const fulfilled = !!(purchase?.provider_completed && purchase?.buyer_completed);
                return {
                        ...serializeService(row),
                        isPurchased: !!purchase && !fulfilled,
                        purchaseId: purchase?.confirmation_status === "confirmed" ? purchase.id : null,
                        claimStatus: purchase && !fulfilled ? purchase.confirmation_status : null,
                        claimPhase: !purchase || fulfilled ? "open" : purchase.confirmation_status === "confirmed" ? "claimed" : null,
                };
        }));
});

router.get("/mine", requireAuth, (req, res) => {
    const rows = db
        .prepare(`${SERVICE_SELECT} WHERE s.provider_id = ? ORDER BY s.created_at DESC`)
        .all(req.userId);
    res.json(rows.map(serializeService));
});

router.get("/purchased", requireAuth, (req, res) => {
    const rows = db.prepare(`
        SELECT p.*, s.title, s.description, s.category, s.price_unit,
            s.provider_id, u.name AS provider_name, u.year AS provider_year,
            u.concentration AS provider_concentration, u.profile_image AS provider_profile_image,
            b.name AS buyer_name, b.year AS buyer_year,
            b.concentration AS buyer_concentration, b.profile_image AS buyer_profile_image
    FROM service_purchases p
    JOIN services s ON s.id = p.service_id
    JOIN users u ON u.id = s.provider_id
        JOIN users b ON b.id = p.buyer_id
    WHERE p.buyer_id = ? AND p.confirmation_status = 'confirmed'
    ORDER BY p.created_at DESC
  `).all(req.userId);
    res.json(rows.map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        title: row.title,
        description: row.description,
        category: row.category,
        price: row.price_cents / 100,
        priceUnit: row.price_unit,
        purchaseType: row.purchase_type,
        confirmationStatus: row.confirmation_status,
        providerCompleted: !!row.provider_completed,
        buyerCompleted: !!row.buyer_completed,
        fulfilled: !!(row.provider_completed && row.buyer_completed),
        status: row.status,
        provider: {
            id: row.provider_id,
            name: row.provider_name,
            year: row.provider_year || "",
            concentration: row.provider_concentration || "",
            profileImage: row.provider_profile_image || null,
        },
        buyer: {
            id: row.buyer_id,
            name: row.buyer_name,
            year: row.buyer_year || "",
            concentration: row.buyer_concentration || "",
            profileImage: row.buyer_profile_image || null,
        },
        createdAt: row.created_at,
        usedAt: row.used_at,
        cancelledAt: row.cancelled_at,
    })));
});

router.get("/instances", requireAuth, (req, res) => {
    const rows = db.prepare(`
        SELECT p.*, s.title, s.price_unit, s.provider_id,
            u.name AS buyer_name, u.year AS buyer_year,
            u.concentration AS buyer_concentration, u.profile_image AS buyer_profile_image
        FROM service_purchases p
        JOIN services s ON s.id = p.service_id
        JOIN users u ON u.id = p.buyer_id
        WHERE s.provider_id = ? AND p.confirmation_status = 'confirmed'
        ORDER BY p.created_at DESC
    `).all(req.userId);
    res.json(rows.map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        providerId: row.provider_id,
        title: row.title,
        price: row.price_cents / 100,
        priceUnit: row.price_unit,
        status: row.provider_completed && row.buyer_completed ? "fulfilled" : "claimed",
        providerCompleted: !!row.provider_completed,
        buyerCompleted: !!row.buyer_completed,
        buyer: {
            id: row.buyer_id,
            name: row.buyer_name,
            year: row.buyer_year || "",
            concentration: row.buyer_concentration || "",
            profileImage: row.buyer_profile_image || null,
        },
        createdAt: row.created_at,
    })));
});

router.get("/instances/:id", requireAuth, (req, res) => {
    const row = db.prepare(`
        SELECT p.*, s.title, s.description, s.images_json, s.price_unit, s.provider_id,
            provider.name AS provider_name, provider.year AS provider_year,
            provider.concentration AS provider_concentration, provider.profile_image AS provider_profile_image,
            buyer.name AS buyer_name, buyer.year AS buyer_year,
            buyer.concentration AS buyer_concentration, buyer.profile_image AS buyer_profile_image
        FROM service_purchases p
        JOIN services s ON s.id = p.service_id
        JOIN users provider ON provider.id = s.provider_id
        JOIN users buyer ON buyer.id = p.buyer_id
        WHERE p.id = ?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: "Tutoring claim not found" });
    if (row.confirmation_status !== "confirmed") {
        return res.status(404).json({ error: "This tutoring claim is not active yet" });
    }
    if (row.provider_id !== req.userId && row.buyer_id !== req.userId) {
        return res.status(403).json({ error: "Only the tutor or student can view this tutoring claim" });
    }
    res.json({
        id: row.id,
        serviceId: row.service_id,
        title: row.title,
        description: row.description,
        images: JSON.parse(row.images_json || "[]"),
        price: row.price_cents / 100,
        priceUnit: row.price_unit,
        confirmationStatus: row.confirmation_status,
        providerCompleted: !!row.provider_completed,
        buyerCompleted: !!row.buyer_completed,
        fulfilled: !!(row.provider_completed && row.buyer_completed),
        provider: {
            id: row.provider_id,
            name: row.provider_name,
            year: row.provider_year || "",
            concentration: row.provider_concentration || "",
            profileImage: row.provider_profile_image || null,
        },
        buyer: {
            id: row.buyer_id,
            name: row.buyer_name,
            year: row.buyer_year || "",
            concentration: row.buyer_concentration || "",
            profileImage: row.buyer_profile_image || null,
        },
        createdAt: row.created_at,
    });
});

router.get("/:id", requireAuth, (req, res) => {
    const row = db.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: "Tutoring offer not found" });
    const purchase = db.prepare(`
        SELECT p.confirmation_status, p.provider_completed, p.buyer_completed
        FROM service_purchases p
        WHERE p.service_id = ? AND p.buyer_id = ? AND p.confirmation_status != 'declined'
            AND p.id = (
                SELECT latest.id FROM service_purchases latest
                WHERE latest.service_id = p.service_id
                    AND latest.buyer_id = p.buyer_id
                    AND latest.confirmation_status != 'declined'
                ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1
            )
    `).get(row.id, req.userId);
    const detailPurchase = req.query.purchase
        ? db.prepare("SELECT p.id, p.buyer_id, p.provider_completed, p.buyer_completed, p.confirmation_status FROM service_purchases p WHERE p.id = ? AND p.service_id = ?").get(req.query.purchase, row.id)
        : null;
    if (detailPurchase && detailPurchase.buyer_id !== req.userId && row.provider_id !== req.userId) {
        return res.status(404).json({ error: "Service purchase not found" });
    }
    const fulfilled = !!(purchase?.provider_completed && purchase?.buyer_completed);
    res.json({
        ...serializeService(row),
        isPurchased: !!purchase && !fulfilled,
        purchaseId: purchase?.confirmation_status === "confirmed" ? purchase.id : null,
        claimStatus: purchase && !fulfilled ? purchase.confirmation_status : null,
        purchase: detailPurchase ? {
            id: detailPurchase.id,
            providerCompleted: !!detailPurchase.provider_completed,
            buyerCompleted: !!detailPurchase.buyer_completed,
            confirmationStatus: detailPurchase.confirmation_status,
        } : null,
    });
});

router.post("/:id/purchase", requireAuth, async (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.status !== "active") return res.status(409).json({ error: "This tutoring offer is not currently available" });
    if (service.provider_id === req.userId) return res.status(400).json({ error: "You cannot purchase your own tutoring offer" });
    const existingPurchase = db.prepare("SELECT 1 FROM service_purchases WHERE service_id = ? AND buyer_id = ? AND confirmation_status != 'declined' AND status != 'cancelled' AND NOT (provider_completed = 1 AND buyer_completed = 1) AND julianday('now') - julianday(created_at) < 1").get(service.id, req.userId);
    if (existingPurchase) {
        return res.status(409).json({ error: "You have already purchased this tutoring offer" });
    }
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 50) : "";

    const buyer = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
    const hold = await stripeLib.authorizeHold({
        amountCents: service.price_cents,
        paymentMethodId: req.body?.paymentMethodId,
        customerEmail: buyer.email,
    });
    const id = crypto.randomUUID();
    db.prepare(`
    INSERT INTO service_purchases (id, service_id, buyer_id, purchase_type, status, price_cents, payment_intent_id, used_at, request_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
        id,
        service.id,
        req.userId,
        "one_time",
        "used",
        service.price_cents,
        hold.paymentIntentId,
        new Date().toISOString(),
        note
    );
    db.prepare("UPDATE service_purchases SET confirmation_status = 'pending' WHERE id = ?").run(id);
    db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'service_purchase', ?, ?, ?, ?)")
        .run(crypto.randomUUID(), service.provider_id, service.id, id, req.userId, `Someone wants to claim your tutoring offer.${note ? ` Note: ${note}` : ""}`);
    res.status(201).json({ id, serviceId: service.id, purchaseType: "one_time", price: service.price_cents / 100, status: "used", paymentMock: hold.mock });
});

router.post("/instances/:id/complete", requireAuth, (req, res) => {
    const purchase = db.prepare(`
        SELECT p.*, s.provider_id
        FROM service_purchases p JOIN services s ON s.id = p.service_id
        WHERE p.id = ?
    `).get(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Tutoring instance not found" });
    if (purchase.confirmation_status !== "confirmed") return res.status(409).json({ error: "This tutoring claim has not been confirmed" });
    const isProvider = purchase.provider_id === req.userId;
    const isBuyer = purchase.buyer_id === req.userId;
    if (!isProvider && !isBuyer) return res.status(403).json({ error: "Only the tutor or student can mark this tutoring session fulfilled" });
    const providerCompleted = purchase.provider_completed || isProvider ? 1 : 0;
    const buyerCompleted = purchase.buyer_completed || isBuyer ? 1 : 0;
    const wasFulfilled = !!(purchase.provider_completed && purchase.buyer_completed);
    db.prepare("UPDATE service_purchases SET provider_completed = ?, buyer_completed = ?, status = ? WHERE id = ?")
        .run(providerCompleted, buyerCompleted, providerCompleted && buyerCompleted ? "used" : "active", purchase.id);
    if (providerCompleted && buyerCompleted && !wasFulfilled) {
        db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'review_request', ?, ?, ?, ?)")
            .run(crypto.randomUUID(), purchase.buyer_id, purchase.service_id, purchase.id, purchase.provider_id, "Your tutoring session was fully fulfilled. Leave a review.");
        db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'review_request', ?, ?, ?, ?)")
            .run(crypto.randomUUID(), purchase.provider_id, purchase.service_id, purchase.id, purchase.buyer_id, "Your tutoring session was fully fulfilled. Leave a review.");
    }
    res.json({ ok: true, fulfilled: !!(providerCompleted && buyerCompleted) });
});

router.get("/:id/customers", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) return res.status(403).json({ error: "Only the tutor can view student requests" });
    const rows = db.prepare(`SELECT p.id, p.purchase_type, p.status, p.confirmation_status, p.created_at, u.id AS buyer_id, u.name AS buyer_name FROM service_purchases p JOIN users u ON u.id = p.buyer_id WHERE p.service_id = ? AND p.confirmation_status = 'pending' ORDER BY p.created_at`).all(service.id);
    res.json(rows.map((row) => ({ id: row.id, buyer: { id: row.buyer_id, name: row.buyer_name }, status: row.confirmation_status, createdAt: row.created_at })));
});

router.post("/:id/customers/:purchaseId/confirm", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) return res.status(403).json({ error: "Only the tutor can confirm students" });
    if (service.status !== "active") return res.status(409).json({ error: "This tutoring offer is paused and can no longer accept new claims" });
    const result = db.prepare("UPDATE service_purchases SET confirmation_status = 'confirmed' WHERE id = ? AND service_id = ? AND confirmation_status = 'pending'").run(req.params.purchaseId, service.id);
    if (!result.changes) return res.status(409).json({ error: "Purchase is no longer pending" });
    const purchase = db.prepare("SELECT buyer_id FROM service_purchases WHERE id = ?").get(req.params.purchaseId);
    const conversationId = require("../lib/conversations").getConversationId(purchase.buyer_id, service.provider_id);
    db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE purchase_id = ?").run(req.params.purchaseId);
    db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'service_confirmed', ?, ?, ?, ?)").run(crypto.randomUUID(), purchase.buyer_id, service.id, req.params.purchaseId, req.userId, "Your tutoring claim was accepted.");
    db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'service_confirmation_sent', ?, ?, ?, ?)").run(crypto.randomUUID(), req.userId, service.id, req.params.purchaseId, purchase.buyer_id, "You accepted a request for this tutoring offer.");
    res.json({ ok: true, conversationId });
});

router.post("/:id/customers/:purchaseId/decline", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) return res.status(403).json({ error: "Only the tutor can decline students" });
    const result = db.prepare("UPDATE service_purchases SET confirmation_status = 'declined' WHERE id = ? AND service_id = ? AND confirmation_status = 'pending'").run(req.params.purchaseId, service.id);
    if (!result.changes) return res.status(409).json({ error: "Purchase is no longer pending" });
    db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE purchase_id = ?").run(req.params.purchaseId);
    const purchase = db.prepare("SELECT buyer_id FROM service_purchases WHERE id = ?").get(req.params.purchaseId);
    db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'service_declined', ?, ?, ?, ?)").run(crypto.randomUUID(), purchase.buyer_id, service.id, req.params.purchaseId, req.userId, "Your tutoring claim was declined.");
    res.json({ ok: true });
});

router.post("/", requireAuth, (req, res) => {
    const { category, title, description, price, images } = req.body || {};
    if (!VALID_CATEGORIES.has(category)) {
        return res.status(400).json({ error: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}` });
    }
    if (!title || !String(title).trim()) {
        return res.status(400).json({ error: "title is required" });
    }
    if (String(title).trim().length > MAX_TITLE_LENGTH) {
        return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
    }
    if (String(description || "").length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
    }
    const priceCents = Math.round(Number(price) * 100);
    if (!priceCents || priceCents <= 0) {
        return res.status(400).json({ error: "price must be a positive number" });
    }
    let imagesJson;
    try { imagesJson = parseImages(images) || "[]"; } catch (err) { return res.status(400).json({ error: err.message }); }
    const id = crypto.randomUUID();
    db.prepare(
        `INSERT INTO services (id, category, title, description, images_json, price_cents, price_unit, provider_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, category, title.trim(), (description || "").trim(), imagesJson, priceCents, "per booking", req.userId);

    const row = db.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).get(id);
    res.status(201).json(serializeService(row));
});

router.patch("/:id", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) {
        return res.status(403).json({ error: "Only the tutor can edit this tutoring offer" });
    }

    const { title, description, price, images } = req.body || {};
    if (!title || !String(title).trim()) {
        return res.status(400).json({ error: "title is required" });
    }
    if (String(title).trim().length > MAX_TITLE_LENGTH) {
        return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
    }
    if (String(description || "").length > MAX_DESCRIPTION_LENGTH) {
        return res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
    }
    if (price !== undefined && service.status !== "inactive") {
        return res.status(409).json({ error: "A tutoring price can only be changed while the tutoring offer is paused" });
    }
    const priceCents = price === undefined ? service.price_cents : Math.round(Number(price) * 100);
    if (!priceCents || priceCents <= 0) {
        return res.status(400).json({ error: "price must be a positive number" });
    }
    let imagesJson;
    try { imagesJson = parseImages(images); } catch (err) { return res.status(400).json({ error: err.message }); }
    if (imagesJson === null) imagesJson = "[]";

    db.prepare("UPDATE services SET title = ?, description = ?, images_json = ?, price_cents = ? WHERE id = ?")
        .run(title.trim(), (description || "").trim(), imagesJson, priceCents, service.id);
    const row = db.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).get(service.id);
    res.json(serializeService(row));
});

router.post("/:id/reoffer", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) {
        return res.status(403).json({ error: "Only the tutor can re-offer this tutoring offer" });
    }
    if (service.status !== "inactive") {
        return res.status(409).json({ error: "Only a paused service can be re-offered" });
    }

    const { title, description, price, images } = req.body || {};
    const priceCents = Math.round(Number(price) * 100);
    if (!title || !String(title).trim()) return res.status(400).json({ error: "title is required" });
    if (String(title).trim().length > MAX_TITLE_LENGTH) return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
    if (String(description || "").length > MAX_DESCRIPTION_LENGTH) return res.status(400).json({ error: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
    if (!priceCents || priceCents <= 0) return res.status(400).json({ error: "price must be a positive number" });
    let imagesJson;
    try { imagesJson = parseImages(images) || "[]"; } catch (err) { return res.status(400).json({ error: err.message }); }

    db.prepare("UPDATE services SET title = ?, description = ?, images_json = ?, price_cents = ?, status = 'active' WHERE id = ?")
        .run(title.trim(), (description || "").trim(), imagesJson, priceCents, service.id);
    const row = db.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).get(service.id);
    res.json(serializeService(row));
});

router.post("/:id/deactivate", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) {
        return res.status(403).json({ error: "Only the tutor can deactivate this tutoring offer" });
    }

    db.transaction(() => {
        const pending = db.prepare("SELECT id, buyer_id FROM service_purchases WHERE service_id = ? AND confirmation_status = 'pending'").all(service.id);
        if (pending.length > 0) {
            db.prepare("UPDATE service_purchases SET confirmation_status = 'declined' WHERE service_id = ? AND confirmation_status = 'pending'").run(service.id);
            db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE service_id = ? AND type = 'service_purchase'").run(service.id);
            const addDeclineNotification = db.prepare("INSERT INTO notifications (id, recipient_id, type, service_id, purchase_id, actor_id, message) VALUES (?, ?, 'service_declined', ?, ?, ?, ?)");
            for (const purchase of pending) {
                addDeclineNotification.run(crypto.randomUUID(), purchase.buyer_id, service.id, purchase.id, req.userId, "Your tutoring claim was declined.");
            }
        }
        db.prepare("UPDATE services SET status = 'inactive' WHERE id = ?").run(service.id);
    })();

    const row = db.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).get(service.id);
    res.json(serializeService(row));
});

router.post("/:id/activate", requireAuth, (req, res) => {
    const service = db.prepare("SELECT * FROM services WHERE id = ?").get(req.params.id);
    if (!service) return res.status(404).json({ error: "Tutoring offer not found" });
    if (service.provider_id !== req.userId) {
        return res.status(403).json({ error: "Only the tutor can resume this tutoring offer" });
    }
    db.prepare("UPDATE services SET status = 'active' WHERE id = ?").run(service.id);
    const row = db.prepare(`${SERVICE_SELECT} WHERE s.id = ?`).get(service.id);
    res.json(serializeService(row));
});

module.exports = router;