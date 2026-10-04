const db = require("../db");
const { deleteImage, cloudinaryConfigured } = require("./cloudinary");

// Calendar months, clamped to the last day of the destination month.
function expiryAfterFourMonths(date) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + 4);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

let running = false;
async function cleanupExpiredListings(now = new Date()) {
  if (running) return;
  running = true;
  try {
    const expired = await db.prepare("SELECT id FROM items WHERE removed_at IS NOT NULL AND expires_at <= ?").all(now.toISOString());
    for (const item of expired) {
      await db.transaction(async tx => {
        // Claim the row before removing dependencies; a concurrent relist cancels expiry.
        const claimed = await tx.prepare("UPDATE items SET status = status WHERE id = ? AND removed_at IS NOT NULL AND expires_at <= ?").run(item.id, now.toISOString());
        if (!claimed.changes) return;
        const row = await tx.prepare("SELECT image_public_ids_json FROM items WHERE id = ?").get(item.id);
        for (const id of JSON.parse(row.image_public_ids_json || "[]").filter(Boolean)) {
          await tx.prepare("INSERT INTO image_cleanup_queue (id) VALUES (?) ON CONFLICT (id) DO NOTHING").run(id);
        }
        await tx.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE item_id = ?)").run(item.id);
        await tx.prepare("DELETE FROM conversations WHERE item_id = ?").run(item.id);
        await tx.prepare("DELETE FROM items WHERE id = ?").run(item.id);
      });
    }
    // Persist failed deletions so a temporary storage outage cannot orphan photos.
    if (cloudinaryConfigured()) {
      const queued = await db.prepare("SELECT id FROM image_cleanup_queue").all();
      for (const asset of queued) {
        try {
          await deleteImage(asset.id);
          await db.prepare("DELETE FROM image_cleanup_queue WHERE id = ?").run(asset.id);
        } catch (error) { console.error("Expired listing image cleanup failed:", error); }
      }
    }
  } finally { running = false; }
}
module.exports = { expiryAfterFourMonths, cleanupExpiredListings };
