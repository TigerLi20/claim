const express = require("express");
const { randomUUID } = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const { prepareImageAssets, deleteImageAssets } = require("../lib/imageAssets");
const { getConversationId } = require("../lib/conversations");

const router = express.Router();
const categories = ["books", "electronics", "furniture", "clothing", "home", "other"];
const conditions = ["new", "like-new", "used"];
const parse = (value) => { try { return JSON.parse(value || "[]"); } catch { return []; } };
const shape = (row) => ({
  id: row.id, sellerId: row.seller_id, title: row.title, description: row.description,
  price: row.price_cents / 100, category: row.category, condition: row.condition,
  images: parse(row.images_json), status: row.status, createdAt: row.created_at,
  seller: { id: row.seller_id, name: row.seller_name, year: row.seller_year || "", concentration: row.seller_concentration || "", profileImage: row.seller_image || null },
});
const select = `SELECT i.*, u.name AS seller_name, u.year AS seller_year, u.concentration AS seller_concentration, u.profile_image AS seller_image FROM items i JOIN users u ON u.id = i.seller_id`;
function validate(body) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (body.price === undefined || body.price === null || body.price === "") throw new Error("Enter a price.");
  const price = Number(body.price);
  if (!title || title.length > 120 || !description || description.length > 2000) throw new Error("Enter a title (up to 120 characters) and description (up to 2000 characters).");
  if (!Number.isFinite(price) || price < 0 || price > 100000 || !Number.isInteger(price * 100)) throw new Error("Enter a valid price in dollars and cents.");
  if (!categories.includes(body.category) || !conditions.includes(body.condition)) throw new Error("Choose a valid category and condition.");
  return { title, description, priceCents: Math.round(price * 100), category: body.category, condition: body.condition };
}
async function find(id) { return db.prepare(`${select} WHERE i.id = ?`).get(id); }
router.get("/", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : "";
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 120).toLowerCase() : "";
  if (category && !categories.includes(category)) return res.status(400).json({ error: "Invalid category" });
  const rows = await db.prepare(`${select} WHERE i.status = 'available' AND (? = '' OR i.category = ?) AND (? = '' OR LOWER(i.title) LIKE ?) ORDER BY i.created_at DESC`).all(category, category, search, `%${search}%`);
  res.json(rows.map(shape));
});
router.get("/mine/listings", requireAuth, async (req, res) => {
  const rows = await db.prepare(`${select} WHERE i.seller_id = ? ORDER BY i.created_at DESC`).all(req.userId);
  res.json(rows.map(shape));
});
router.get("/mine/inquiries", requireAuth, async (req, res) => {
  const rows = await db.prepare(`${select} JOIN conversations c ON c.item_id = i.id WHERE (c.user_a_id = ? OR c.user_b_id = ?) AND i.seller_id != ? ORDER BY c.created_at DESC`).all(req.userId, req.userId, req.userId);
  res.json(rows.map(shape));
});
router.post("/", requireAuth, async (req, res) => {
  let fields; try { fields = validate(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
  let assets; try { assets = await prepareImageAssets(req.body.images || [], { folder: "claimco/items" }); } catch (error) { return res.status(400).json({ error: error.message }); }
  const id = randomUUID();
  try {
    await db.prepare("INSERT INTO items (id, seller_id, title, description, price_cents, category, condition, images_json, image_public_ids_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, req.userId, fields.title, fields.description, fields.priceCents, fields.category, fields.condition, JSON.stringify(assets.map(a => a.url)), JSON.stringify(assets.map(a => a.publicId)));
    res.status(201).json(shape(await find(id)));
  } catch (error) { await deleteImageAssets(assets.map(a => a.publicId)); throw error; }
});
router.get("/:id", async (req, res) => {
  const row = await find(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  res.json(shape(row));
});
router.patch("/:id", requireAuth, async (req, res) => {
  const row = await find(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  if (row.seller_id !== req.userId) return res.status(403).json({ error: "Only the seller can edit this item" });
  let fields; try { fields = validate({ ...shape(row), ...req.body }); } catch (error) { return res.status(400).json({ error: error.message }); }
  const oldImages = parse(row.images_json), oldIds = parse(row.image_public_ids_json);
  let assets;
  try { assets = await prepareImageAssets(req.body.images, { folder: "claimco/items", existingImages: oldImages, existingPublicIds: oldIds }); } catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    await db.prepare("UPDATE items SET title = ?, description = ?, price_cents = ?, category = ?, condition = ?, images_json = ?, image_public_ids_json = ? WHERE id = ?").run(fields.title, fields.description, fields.priceCents, fields.category, fields.condition, JSON.stringify(assets ? assets.map(a => a.url) : oldImages), JSON.stringify(assets ? assets.map(a => a.publicId) : oldIds), row.id);
    if (assets) await deleteImageAssets(oldIds.filter(id => !assets.some(a => a.publicId === id)));
    res.json(shape(await find(row.id)));
  } catch (error) { if (assets) await deleteImageAssets(assets.map(a => a.publicId).filter(id => !oldIds.includes(id))); throw error; }
});
router.patch("/:id/status", requireAuth, async (req, res) => {
  const row = await find(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  if (row.seller_id !== req.userId) return res.status(403).json({ error: "Only the seller can change status" });
  if (!["available", "pending", "sold"].includes(req.body.status)) return res.status(400).json({ error: "Invalid status" });
  await db.prepare("UPDATE items SET status = ? WHERE id = ?").run(req.body.status, row.id);
  res.json(shape(await find(row.id)));
});
router.delete("/:id", requireAuth, async (req, res) => {
  const row = await find(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  if (row.seller_id !== req.userId) return res.status(403).json({ error: "Only the seller can remove this item" });
  await db.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE item_id = ?)").run(row.id);
  await db.prepare("DELETE FROM conversations WHERE item_id = ?").run(row.id);
  await db.prepare("DELETE FROM items WHERE id = ?").run(row.id);
  await deleteImageAssets(parse(row.image_public_ids_json));
  res.json({ ok: true });
});
router.post("/:id/interest", requireAuth, async (req, res) => {
  const row = await find(req.params.id);
  if (!row) return res.status(404).json({ error: "Item not found" });
  if (row.seller_id === req.userId) return res.status(400).json({ error: "You cannot message yourself" });
  const existing = await db.prepare("SELECT id FROM conversations WHERE item_id = ? AND (user_a_id = ? OR user_b_id = ?)").get(row.id, req.userId, req.userId);
  if (row.status === "sold" && !existing) return res.status(409).json({ error: "This item has sold" });
  const conversationId = await getConversationId(row.id, req.userId, row.seller_id);
  res.status(existing ? 200 : 201).json({ conversationId });
});
module.exports = router;
