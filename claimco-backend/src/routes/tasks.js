const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { splitPayment } = require("../lib/money");
const stripeLib = require("../lib/stripe");

const router = express.Router();
const VALID_CATEGORIES = new Set(["moveout", "errand", "event"]);
const MAX_IMAGES = 3;
const MAX_IMAGE_LENGTH = 2000000;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1000;

function expireUnclaimableTasks() {
  return db.prepare(`
    UPDATE tasks
    SET status = 'cancelled', cancelled_at = datetime('now')
    WHERE status = 'open'
      AND scheduled_at IS NOT NULL
      AND datetime(replace(scheduled_at, 'T', ' ') || CASE WHEN instr(scheduled_at, 'T') = 0 THEN ' 23:59:59' ELSE '' END) <= datetime('now', 'localtime')
      AND NOT EXISTS (
        SELECT 1 FROM task_applications
        WHERE task_applications.task_id = tasks.id
          AND task_applications.status = 'pending'
      )
  `).run().changes;
}

function parseImages(value) {
  if (value === undefined) return null;
  if (!Array.isArray(value) || value.length > MAX_IMAGES || value.some((image) => typeof image !== "string" || image.length > MAX_IMAGE_LENGTH || !/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image))) {
    throw new Error("Add up to 3 valid images, each no larger than 1.5 MB after compression.");
  }
  return JSON.stringify(value);
}

function hasPassedScheduledAt(value) {
  return value && db.prepare("SELECT CASE WHEN instr(?, 'T') = 0 THEN date(?) < date('now', 'localtime') ELSE datetime(replace(?, 'T', ' ')) <= datetime('now', 'localtime', '+10 minutes') END AS passed").get(value, value, value).passed;
}

function normalizeScheduledAt(scheduledDate, scheduledTime, legacyScheduledAt) {
  if (scheduledDate) return `${scheduledDate}${scheduledTime ? `T${scheduledTime}` : ""}`;
  return legacyScheduledAt || "";
}

function getUser(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

function canViewTask(task, userId) {
  if (!task || !userId) return false;
  if (task.status === "open") return true;
  return task.requester_id === userId || task.worker_id === userId;
}

function serializeTask(row) {
  const requesterAnonymous = !!row.requester_anonymous;
  const workerAnonymous = !!row.worker_anonymous;
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    scheduledAt: row.scheduled_at || "",
    location: row.location || "",
    notes: row.notes || row.description || "",
    images: JSON.parse(row.images_json || "[]"),
    price: row.price_cents / 100,
    status: row.status,
    claimRequested: !!row.claim_requested,
    requester: {
      id: row.requester_id,
      name: requesterAnonymous ? "Anonymous" : row.requester_name,
      year: requesterAnonymous ? "" : row.requester_year || "",
      concentration: requesterAnonymous ? "" : row.requester_concentration || "",
      profileImage: requesterAnonymous ? null : row.requester_profile_image || null,
      isAnonymous: requesterAnonymous,
    },
    worker: row.worker_id
      ? {
        id: row.worker_id,
        name: workerAnonymous ? "Anonymous" : row.worker_name,
        year: workerAnonymous ? "" : row.worker_year || "",
        concentration: workerAnonymous ? "" : row.worker_concentration || "",
        profileImage: workerAnonymous ? null : row.worker_profile_image || null,
        isAnonymous: workerAnonymous,
      }
      : null,
    platformCut: row.platform_cut_cents != null ? row.platform_cut_cents / 100 : null,
    workerPayout: row.worker_payout_cents != null ? row.worker_payout_cents / 100 : null,
    requesterCompleted: !!row.requester_completed,
    workerCompleted: !!row.worker_completed,
    fulfilled: !!(row.requester_completed && row.worker_completed),
    claimedAt: row.claimed_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
  };
}

const TASK_SELECT = `
  SELECT t.*,
    ru.name AS requester_name, ru.year AS requester_year,
    ru.concentration AS requester_concentration, ru.profile_image AS requester_profile_image,
    wu.name AS worker_name, wu.year AS worker_year,
    wu.concentration AS worker_concentration, wu.profile_image AS worker_profile_image
  FROM tasks t
  JOIN users ru ON ru.id = t.requester_id
  LEFT JOIN users wu ON wu.id = t.worker_id
`;

// GET /tasks — the public board. Only open future tickets are browseable.
router.get("/", requireAuth, (req, res) => {
  const rows = db.prepare(`${TASK_SELECT.replace("SELECT t.*,", "SELECT t.*, current_application.id AS current_application_id,")}
    LEFT JOIN task_applications current_application
      ON current_application.task_id = t.id
      AND current_application.worker_id = ?
      AND current_application.status = 'pending'
    WHERE t.status = 'open'
      AND (t.scheduled_at IS NULL OR datetime(replace(t.scheduled_at, 'T', ' ') || CASE WHEN instr(t.scheduled_at, 'T') = 0 THEN ' 23:59:59' ELSE '' END) > datetime('now', 'localtime'))
      AND NOT EXISTS (
        SELECT 1 FROM task_applications declined_application
        WHERE declined_application.task_id = t.id
          AND declined_application.worker_id = ?
          AND declined_application.status = 'declined'
      )
    ORDER BY t.created_at DESC`).all(req.userId, req.userId);
  rows.forEach((row) => { row.claim_requested = !!row.current_application_id; });
  res.json(rows.map(serializeTask));
});

router.get("/stats", requireAuth, (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open' AND (scheduled_at IS NULL OR datetime(replace(scheduled_at, 'T', ' ') || CASE WHEN instr(scheduled_at, 'T') = 0 THEN ' 23:59:59' ELSE '' END) > datetime('now', 'localtime'))) AS open_count,
      COUNT(*) FILTER (WHERE status = 'claimed') AS claimed_count,
      COUNT(*) FILTER (WHERE status = 'done') AS fulfilled_count
    FROM tasks
  `).get();
  res.json({ openCount: stats.open_count, claimedCount: stats.claimed_count, fulfilledCount: stats.fulfilled_count });
});

// GET /tasks/mine — everything the signed-in user posted or claimed.
router.get("/mine", requireAuth, (req, res) => {
  const rows = db
    .prepare(`${TASK_SELECT} WHERE t.requester_id = ? OR t.worker_id = ? ORDER BY t.created_at DESC`)
    .all(req.userId, req.userId);
  res.json(rows.map(serializeTask));
});

router.get("/:id", requireAuth, (req, res) => {
  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Task not found" });
  if (!canViewTask(row, req.userId)) {
    return res.status(403).json({ error: "You do not have access to this ticket" });
  }
  res.json(serializeTask(row));
});

// POST /tasks — post a new ticket. In production this should also accept a
// Stripe payment_method id collected via Stripe.js on the frontend so the
// price can actually be authorized; see README for what's stubbed here.
router.post("/", requireAuth, async (req, res) => {
  const { category, title, scheduledDate, scheduledTime, scheduledAt: legacyScheduledAt, location, notes, price, anonymous, images } = req.body || {};
  const scheduledAt = normalizeScheduledAt(scheduledDate, scheduledTime, legacyScheduledAt);

  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}` });
  }
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (String(title).trim().length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }
  if (!scheduledAt) {
    return res.status(400).json({ error: "Task date is required" });
  }
  if (!String(location || "").trim()) {
    return res.status(400).json({ error: "Location is required" });
  }
  if (!String(notes || "").trim()) {
    return res.status(400).json({ error: "Details are required" });
  }
  if (String(notes || "").length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({ error: `Details must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
  }
  if (hasPassedScheduledAt(scheduledAt)) {
    return res.status(400).json({ error: "Task date and time must be at least 10 minutes in the future" });
  }
  const priceCents = Math.round(Number(price) * 100);
  if (!priceCents || priceCents <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  let imagesJson;
  try { imagesJson = parseImages(images) || "[]"; } catch (err) { return res.status(400).json({ error: err.message }); }

  const requester = getUser(req.userId);
  const hold = await stripeLib.authorizeHold({
    amountCents: priceCents,
    paymentMethodId: req.body.paymentMethodId,
    customerEmail: requester.email,
  });

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO tasks (
      id, category, title, description, scheduled_at, location, notes, images_json, price_cents, requester_id,
       requester_anonymous, payment_intent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, category, title.trim(), (notes || "").trim(), scheduledAt || null, (location || "").trim(), (notes || "").trim(), imagesJson, priceCents, req.userId, anonymous ? 1 : 0, hold.paymentIntentId);

  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id);
  res.status(201).json({ task: serializeTask(row), paymentMock: hold.mock });
});

router.patch("/:id", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.requester_id !== req.userId) {
    return res.status(403).json({ error: "Only the requester can edit this ticket" });
  }
  if (task.status !== "open") {
    return res.status(409).json({ error: "A ticket can only be edited before it is claimed" });
  }

  const { category, title, scheduledDate, scheduledTime, scheduledAt: legacyScheduledAt, location, notes, images } = req.body || {};
  const scheduledAt = normalizeScheduledAt(scheduledDate, scheduledTime, legacyScheduledAt);
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}` });
  }
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (String(title).trim().length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }
  if (!scheduledAt) {
    return res.status(400).json({ error: "Task date is required" });
  }
  if (!String(location || "").trim()) {
    return res.status(400).json({ error: "Location is required" });
  }
  if (!String(notes || "").trim()) {
    return res.status(400).json({ error: "Details are required" });
  }
  if (String(notes || "").length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({ error: `Details must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
  }
  if (hasPassedScheduledAt(scheduledAt)) {
    return res.status(400).json({ error: "Task date and time must be at least 10 minutes in the future" });
  }
  let imagesJson;
  try { imagesJson = parseImages(images); } catch (err) { return res.status(400).json({ error: err.message }); }
  if (imagesJson === null) imagesJson = "[]";
  db.prepare(
    "UPDATE tasks SET category = ?, title = ?, description = ?, scheduled_at = ?, location = ?, notes = ?, images_json = ? WHERE id = ?"
  ).run(category, title.trim(), (notes || "").trim(), scheduledAt || null, (location || "").trim(), (notes || "").trim(), imagesJson, task.id);
  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(task.id);
  res.json(serializeTask(row));
});

router.post("/:id/reoffer", requireAuth, async (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.requester_id !== req.userId) {
    return res.status(403).json({ error: "Only the requester can re-offer this ticket" });
  }
  if (!["done", "cancelled"].includes(task.status)) {
    return res.status(409).json({ error: "Only cancelled or fulfilled tickets can be re-offered" });
  }

  const { category, title, scheduledDate, scheduledTime, scheduledAt: legacyScheduledAt, location, notes, price, images } = req.body || {};
  const scheduledAt = normalizeScheduledAt(scheduledDate, scheduledTime, legacyScheduledAt);
  if (!VALID_CATEGORIES.has(category)) {
    return res.status(400).json({ error: `category must be one of: ${[...VALID_CATEGORIES].join(", ")}` });
  }
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (String(title).trim().length > MAX_TITLE_LENGTH) {
    return res.status(400).json({ error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer` });
  }
  if (!scheduledAt) {
    return res.status(400).json({ error: "Task date is required" });
  }
  if (!String(location || "").trim()) {
    return res.status(400).json({ error: "Location is required" });
  }
  if (!String(notes || "").trim()) {
    return res.status(400).json({ error: "Details are required" });
  }
  if (String(notes || "").length > MAX_DESCRIPTION_LENGTH) {
    return res.status(400).json({ error: `Details must be ${MAX_DESCRIPTION_LENGTH} characters or fewer` });
  }
  if (hasPassedScheduledAt(scheduledAt)) {
    return res.status(400).json({ error: "Task date and time must be at least 10 minutes in the future" });
  }
  const priceCents = Math.round(Number(price) * 100);
  if (!priceCents || priceCents <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  let imagesJson;
  try { imagesJson = parseImages(images) || "[]"; } catch (err) { return res.status(400).json({ error: err.message }); }

  const requester = getUser(req.userId);
  const hold = await stripeLib.authorizeHold({
    amountCents: priceCents,
    paymentMethodId: req.body.paymentMethodId,
    customerEmail: requester.email,
  });
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO tasks (
      id, category, title, description, scheduled_at, location, notes, images_json, price_cents, requester_id,
       requester_anonymous, payment_intent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, category, title.trim(), (notes || "").trim(), scheduledAt || null, (location || "").trim(), (notes || "").trim(), imagesJson, priceCents, req.userId, task.requester_anonymous, hold.paymentIntentId);

  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(id);
  res.status(201).json({ task: serializeTask(row), paymentMock: hold.mock });
});

// POST /tasks/:id/claim — a worker claims an open ticket.
router.post("/:id/claim", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.status !== "open") return res.status(409).json({ error: "Task is no longer open" });
  if (task.requester_id === req.userId) {
    return res.status(400).json({ error: "You can't claim your own ticket" });
  }

  const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 50) : "";

  try {
    const applicationId = db.transaction(() => {
      const latestTask = db.prepare("SELECT status, requester_id FROM tasks WHERE id = ?").get(task.id);
      if (!latestTask || latestTask.status !== "open") {
        const error = new Error("Task is no longer open");
        error.statusCode = 409;
        throw error;
      }

      const existing = db.prepare("SELECT status FROM task_applications WHERE task_id = ? AND worker_id = ?").get(task.id, req.userId);
      if (existing?.status === "pending") {
        const error = new Error("Your request is already pending");
        error.statusCode = 409;
        throw error;
      }
      if (existing?.status === "declined") {
        const error = new Error("Your request was declined");
        error.statusCode = 409;
        throw error;
      }

      const id = crypto.randomUUID();
      db.prepare("INSERT INTO task_applications (id, task_id, worker_id, anonymous, request_note) VALUES (?, ?, ?, ?, ?)")
        .run(id, task.id, req.userId, req.body?.anonymous ? 1 : 0, note);
      db.prepare(`INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_application', ?, ?, ?)`)
        .run(crypto.randomUUID(), latestTask.requester_id, task.id, req.userId, `Someone wants to claim your ticket.${note ? ` Note: ${note}` : ""}`);
      return id;
    })();

    return res.status(202).json({ pending: true, applicationId });
  } catch (error) {
    if (error.statusCode === 409 || error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Your request is already pending" });
    }
    throw error;
  }
});

router.get("/:id/applications", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.requester_id !== req.userId) return res.status(403).json({ error: "Only the requester can view applications" });
  const rows = db.prepare(`SELECT a.*, u.name, u.year, u.concentration, u.profile_image FROM task_applications a JOIN users u ON u.id = a.worker_id WHERE a.task_id = ? ORDER BY a.created_at`).all(task.id);
  res.json(rows.map((row) => ({ id: row.id, worker: { id: row.worker_id, name: row.name, year: row.year || "", concentration: row.concentration || "", profileImage: row.profile_image || null }, anonymous: !!row.anonymous, status: row.status, requestNote: row.request_note || "", createdAt: row.created_at })));
});

router.post("/:id/applications/:applicationId/confirm", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.requester_id !== req.userId) return res.status(403).json({ error: "Only the requester can confirm a worker" });
  if (task.status !== "open") return res.status(409).json({ error: "This ticket is no longer open" });

  const application = db.prepare("SELECT * FROM task_applications WHERE id = ? AND task_id = ?").get(req.params.applicationId, task.id);
  if (!application || application.status !== "pending") return res.status(409).json({ error: "Application is no longer pending" });

  try {
    const conversationId = db.transaction(() => {
      const latestTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(task.id);
      if (!latestTask || latestTask.status !== "open") {
        const error = new Error("This ticket is no longer open");
        error.statusCode = 409;
        throw error;
      }

      const latestApplication = db.prepare("SELECT * FROM task_applications WHERE id = ? AND task_id = ?").get(req.params.applicationId, task.id);
      if (!latestApplication || latestApplication.status !== "pending") {
        const error = new Error("Application is no longer pending");
        error.statusCode = 409;
        throw error;
      }

      const declined = db.prepare("SELECT worker_id FROM task_applications WHERE task_id = ? AND id != ? AND status = 'pending'").all(task.id, latestApplication.id);
      db.prepare("UPDATE tasks SET status = 'claimed', worker_id = ?, worker_anonymous = ?, claimed_at = datetime('now') WHERE id = ?")
        .run(latestApplication.worker_id, latestApplication.anonymous, task.id);
      db.prepare("UPDATE task_applications SET status = 'accepted' WHERE id = ?").run(latestApplication.id);
      db.prepare("UPDATE task_applications SET status = 'declined' WHERE task_id = ? AND id != ? AND status = 'pending'").run(task.id, latestApplication.id);
      const addDeclineNotification = db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_declined', ?, ?, ?)");
      for (const applicant of declined) {
        addDeclineNotification.run(crypto.randomUUID(), applicant.worker_id, task.id, req.userId, "Another applicant was selected for this ticket.");
      }
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE task_id = ? AND type = 'task_application'").run(task.id);
      db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_confirmed', ?, ?, ?)").run(crypto.randomUUID(), latestApplication.worker_id, task.id, req.userId, "Your request to claim a ticket was accepted.");
      db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_confirmation_sent', ?, ?, ?)").run(crypto.randomUUID(), req.userId, task.id, latestApplication.worker_id, "You accepted a request to claim this ticket.");
      const conversationId = require("../lib/conversations").getConversationId(latestApplication.worker_id, latestTask.requester_id);
      return conversationId;
    })();

    return res.json({ ok: true, conversationId });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({ error: error.message });
    }
    throw error;
  }
});

router.post("/:id/applications/:applicationId/decline", requireAuth, (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.requester_id !== req.userId) return res.status(403).json({ error: "Only the requester can decline a worker" });
  const result = db.prepare("UPDATE task_applications SET status = 'declined' WHERE id = ? AND task_id = ? AND status = 'pending'").run(req.params.applicationId, task.id);
  if (!result.changes) return res.status(409).json({ error: "Application is no longer pending" });
  const application = db.prepare("SELECT worker_id FROM task_applications WHERE id = ?").get(req.params.applicationId);
  db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_declined', ?, ?, ?)")
    .run(crypto.randomUUID(), application.worker_id, task.id, req.userId, "Your request was not selected for this ticket.");
  res.json({ ok: true });
});

// POST /tasks/:id/complete — either side confirms fulfillment. The ticket
// becomes done only after both the requester and worker confirm.
router.post("/:id/complete", requireAuth, async (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.status !== "claimed") return res.status(409).json({ error: "Task isn't in a claimed state" });
  const isRequester = task.requester_id === req.userId;
  const isWorker = task.worker_id === req.userId;
  if (!isRequester && !isWorker) {
    return res.status(403).json({ error: "Only the requester or confirmed worker can mark it fulfilled" });
  }

  const requesterCompleted = task.requester_completed || isRequester ? 1 : 0;
  const workerCompleted = task.worker_completed || isWorker ? 1 : 0;
  if (requesterCompleted && workerCompleted) {
    const worker = getUser(task.worker_id);
    if (!stripeLib.MOCK && !worker.stripe_account_id) {
      return res.status(400).json({ error: "Finish Stripe Connect onboarding before completing paid tickets" });
    }

    const { platformCutCents, workerPayoutCents } = splitPayment(task.price_cents);
    await stripeLib.captureAndPayout({
      paymentIntentId: task.payment_intent_id,
      workerStripeAccountId: worker.stripe_account_id,
      workerPayoutCents,
    });

    db.prepare(
      `UPDATE tasks SET status = 'done', requester_completed = 1, worker_completed = 1,
          completed_at = datetime('now'), platform_cut_cents = ?, worker_payout_cents = ?
       WHERE id = ?`
    ).run(platformCutCents, workerPayoutCents, task.id);
    db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'review_request', ?, ?, ?)")
      .run(crypto.randomUUID(), task.requester_id, task.id, task.worker_id, "Your ticket was fully fulfilled. Leave a review.");
    db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'review_request', ?, ?, ?)")
      .run(crypto.randomUUID(), task.worker_id, task.id, task.requester_id, "Your ticket was fully fulfilled. Leave a review.");
  } else {
    db.prepare(
      "UPDATE tasks SET requester_completed = ?, worker_completed = ? WHERE id = ?"
    ).run(requesterCompleted, workerCompleted, task.id);
  }

  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(task.id);
  res.json(serializeTask(row));
});

// POST /tasks/:id/cancel — the requester backs out before it's fulfilled.
router.post("/:id/cancel", requireAuth, async (req, res) => {
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  if (task.requester_id !== req.userId) {
    return res.status(403).json({ error: "Only the requester can cancel this ticket" });
  }
  if (task.status !== "open") {
    return res.status(409).json({ error: "Task can no longer be cancelled" });
  }

  await stripeLib.cancelHold(task.payment_intent_id);

  db.transaction(() => {
    const pending = db.prepare("SELECT id, worker_id FROM task_applications WHERE task_id = ? AND status = 'pending'").all(task.id);
    if (pending.length > 0) {
      db.prepare("UPDATE task_applications SET status = 'declined' WHERE task_id = ? AND status = 'pending'").run(task.id);
      db.prepare("UPDATE notifications SET read_at = datetime('now') WHERE task_id = ? AND type = 'task_application'").run(task.id);
      const addDeclineNotification = db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_declined', ?, ?, ?)");
      for (const application of pending) {
        addDeclineNotification.run(crypto.randomUUID(), application.worker_id, task.id, req.userId, "Your request was not selected for this ticket.");
      }
    }
    db.prepare(`UPDATE tasks SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?`).run(task.id);
  })();

  const row = db.prepare(`${TASK_SELECT} WHERE t.id = ?`).get(task.id);
  res.json(serializeTask(row));
});

router.expireUnclaimableTasks = expireUnclaimableTasks;
module.exports = router;
module.exports.canViewTask = canViewTask;
