const express = require("express");
const db = require("../db");
const router = express.Router();
router.get("/:id", async (req, res) => {
  const user = await db.prepare("SELECT id, name, year, concentration, about_me, profile_image FROM users WHERE id = ? AND status = 'active'").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, name: user.name, year: user.year || "", concentration: user.concentration || "", aboutMe: user.about_me || "", profileImage: user.profile_image || null });
});
module.exports = router;
