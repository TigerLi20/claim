const express = require("express");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");
const deliveryProvider = require("../lib/deliveryProvider.factory");
const { generateCode, hashCode, getExpiryTime, extractEmailDomain, normalizeEmail, isExpired, verifyCode } = require("../lib/verificationCodes");
const TEST_IDENTIFIERS = require("../lib/testIdentifiers");
const rateLimiter = require("../lib/rateLimiter");
const { isValidImageString, normalizeImageValue, uploadImageAsset } = require("../lib/cloudinary");
const { deleteImageAssets } = require("../lib/imageAssets");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 600 * 1024 },
  fileFilter: (_, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  },
});

// Optional: restrict signups to a campus email domain, e.g. "brown.edu".
// This is one of the simplest trust levers available — it means everyone on
// the platform is a verified student before you've built anything fancier.
const ALLOWED_EMAIL_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || "";
const MAX_PROFILE_IMAGE_BYTES = 600 * 1024;
const MAX_PROFILE_IMAGE_DATA_LENGTH = Math.ceil(MAX_PROFILE_IMAGE_BYTES / 3) * 4 + 100;

function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    year: user.year || "",
    concentration: user.concentration || "",
    aboutMe: user.about_me || "",
    profileImage: user.profile_image || null,
    stripeOnboarded: !!user.stripe_onboarded,
    phoneNumber: user.phone_number || null,
    schoolEmail: user.school_email || null,
    status: user.status || "active",
    emailVerifiedAt: user.email_verified_at || null,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

router.patch("/profile", requireAuth, upload.single("profileImage"), async (req, res) => {
  const currentUser = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!currentUser) return res.status(404).json({ error: "User not found" });

  const { name, year, concentration, aboutMe } = req.body || {};
  const hasProfileImageField = req.file || (req.body && Object.prototype.hasOwnProperty.call(req.body, "profileImage"));
  const profileImage = req.file ? req.file : (hasProfileImageField ? req.body.profileImage : currentUser.profile_image);
  const cleanName = (name === undefined || name === null ? currentUser.name : String(name)).trim();
  const cleanYear = (year === undefined || year === null ? currentUser.year || "" : String(year)).trim();
  const cleanConcentration = (concentration === undefined || concentration === null ? currentUser.concentration || "" : String(concentration)).trim();

  if (!cleanName) return res.status(400).json({ error: "name is required" });
  if (cleanName.length > 80) return res.status(400).json({ error: "name is too long" });
  if (cleanYear.length > 40) return res.status(400).json({ error: "year is too long" });
  if (cleanConcentration.length > 100) return res.status(400).json({ error: "concentration is too long" });
  const cleanAboutMe = (aboutMe === undefined || aboutMe === null ? currentUser.about_me || "" : String(aboutMe)).trim();
  if (cleanAboutMe.length > 500) return res.status(400).json({ error: "about me is too long" });

  let finalProfileImage = normalizeImageValue(profileImage && typeof profileImage === "string" ? profileImage : null);
  let finalProfileImagePublicId = finalProfileImage === currentUser.profile_image ? currentUser.profile_image_public_id || null : null;

  if (req.file) {
    try {
      const asset = await uploadImageAsset(req.file, { folder: "claimco/users", mimeType: req.file.mimetype || "image/jpeg" });
      finalProfileImage = asset.url;
      finalProfileImagePublicId = asset.publicId;
    } catch (error) {
      console.error("Profile image upload failed:", error);
      return res.status(500).json({ error: "Profile image upload failed." });
    }
  } else if (finalProfileImage !== null && finalProfileImage !== "") {
    const isLegacyBase64 = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(finalProfileImage);
    const isCloudinaryUrl = isValidImageString(finalProfileImage);

    if (!isLegacyBase64 && !isCloudinaryUrl) {
      return res.status(400).json({ error: "profile image must be a valid image upload" });
    }

    if (isLegacyBase64 && finalProfileImage.length > MAX_PROFILE_IMAGE_DATA_LENGTH) {
      return res.status(413).json({ error: "File size is too large. The maximum profile picture size is 600 KB after compression." });
    }
  }

  try {
    await db.prepare(
      `UPDATE users SET name = ?, year = ?, concentration = ?, about_me = ?, profile_image = ?, profile_image_public_id = ? WHERE id = ?`
    ).run(cleanName, cleanYear, cleanConcentration, cleanAboutMe, finalProfileImage || null, finalProfileImagePublicId, req.userId);
  } catch (error) {
    if (req.file && finalProfileImagePublicId) await deleteImageAssets([finalProfileImagePublicId]);
    throw error;
  }

  if (currentUser.profile_image_public_id && currentUser.profile_image_public_id !== finalProfileImagePublicId) {
    await deleteImageAssets([currentUser.profile_image_public_id]);
  }

  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  res.json({ user: publicUser(user) });
});

router.post("/register", async (req, res) => {
  const { name, email, phoneNumber, year, concentration } = req.body || {};

  // Validate required fields
  if (!name || !email || !phoneNumber || !year || !concentration) {
    return res.status(400).json({
      error: "name, email, phoneNumber, year, and concentration are required"
    });
  }

  // Normalize email
  const normalizedEmail = normalizeEmail(email);

  // Validate email domain is in approved_domains
  const domain = extractEmailDomain(normalizedEmail);
  if (!domain) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const approvedDomain = await db.prepare("SELECT domain FROM approved_domains WHERE domain = ?").get(domain);
  if (!approvedDomain) {
    // Generic message to avoid user enumeration
    return res.status(400).json({ error: "Unable to register with these details" });
  }

  // Check if email already claimed by active user
  const existingByEmail = await db.prepare("SELECT id FROM users WHERE school_email = ? AND status = 'active'").get(normalizedEmail);
  if (existingByEmail) {
    return res.status(400).json({ error: "Unable to register with these details" });
  }

  // Check if phone already claimed by active user
  const existingByPhone = await db.prepare("SELECT id FROM users WHERE phone_number = ? AND status = 'active'").get(phoneNumber);
  if (existingByPhone) {
    return res.status(400).json({ error: "Unable to register with these details" });
  }

  // Replace abandoned pending registrations so a failed Back-button cleanup
  // cannot block the user from starting over.
  const pendingByEmail = await db.prepare("SELECT id FROM users WHERE school_email = ? AND status = 'pending'").get(normalizedEmail);
  const pendingByPhone = await db.prepare("SELECT id FROM users WHERE phone_number = ? AND status = 'pending'").get(phoneNumber);
  const pendingIds = [...new Set([pendingByEmail?.id, pendingByPhone?.id].filter(Boolean))];
  for (const pendingId of pendingIds) {
    await db.prepare("DELETE FROM verification_codes WHERE pending_user_id = ?").run(pendingId);
    await db.prepare("DELETE FROM users WHERE id = ? AND status = 'pending'").run(pendingId);
  }

  try {
    // Create pending user
    const userId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO users (id, name, email, password_hash, school_email, phone_number, year, concentration, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(userId, name, normalizedEmail, "", normalizedEmail, phoneNumber, year, concentration, "pending");

    // Generate email verification code
    // Check if this is a test identifier (only in non-production)
    let code;
    if (process.env.NODE_ENV !== "production" && TEST_IDENTIFIERS[normalizedEmail]) {
      code = TEST_IDENTIFIERS[normalizedEmail];
    } else {
      code = generateCode();
    }

    const codeHash = hashCode(code);
    const expiresAt = getExpiryTime();
    const codeId = crypto.randomUUID();

    await db.prepare(
      `INSERT INTO verification_codes (id, pending_user_id, destination, code_hash, expires_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(codeId, userId, normalizedEmail, codeHash, expiresAt, 0);

    // Send verification code via delivery provider
    await deliveryProvider.sendEmail(normalizedEmail, code);

    res.status(201).json({
      pendingUserId: userId,
      message: "Registration started. Check your email for a verification code.",
      email: normalizedEmail
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, code } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !code) {
    return res.status(400).json({ error: "email and a verification code are required" });
  }

  const user = await db.prepare(
    "SELECT * FROM users WHERE email = ? OR school_email = ?"
  ).get(normalizedEmail, normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or verification code" });
  }

  if (user.status !== 'active') {
    return res.status(401).json({ error: "Account not yet verified. Check your email for verification code." });
  }

  const testCode = process.env.NODE_ENV !== "production" ? TEST_IDENTIFIERS[normalizedEmail] : undefined;
  if (testCode && String(code) === String(testCode)) {
    const token = signToken(user);
    return res.json({ token, user: publicUser(user) });
  }

  const verificationRecord = await db.prepare(
    `SELECT * FROM verification_codes
     WHERE pending_user_id = ? AND destination = ? AND consumed_at IS NULL
     ORDER BY created_at DESC LIMIT 1`
  ).get(user.id, normalizedEmail);

  if (!verificationRecord) {
    return res.status(401).json({ error: "Invalid email or verification code" });
  }

  if (isExpired(verificationRecord.expires_at)) {
    return res.status(401).json({ error: "Verification code expired. Request a fresh code." });
  }

  if (!verifyCode(String(code), verificationRecord.code_hash)) {
    await db.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?").run(verificationRecord.id);
    return res.status(401).json({ error: "Invalid email or verification code" });
  }

  await db.prepare("UPDATE verification_codes SET consumed_at = datetime('now') WHERE id = ?").run(verificationRecord.id);
  const token = signToken(user);
  return res.json({ token, user: publicUser(user) });
});

router.post("/request-login-code", async (req, res) => {
  const { email } = req.body || {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return res.status(400).json({ error: "email is required" });
  }

  const user = await db.prepare(
    "SELECT * FROM users WHERE email = ? OR school_email = ?"
  ).get(normalizedEmail, normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or verification code" });
  }

  if (user.status !== 'active') {
    return res.status(401).json({ error: "Account not yet verified. Check your email for verification code." });
  }

  const rateLimitCheck = rateLimiter.check(normalizedEmail, 5, 60 * 60 * 1000);
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: `Too many login code requests. Try again in ${Math.ceil((rateLimitCheck.resetAt - new Date()) / 1000)} seconds.`
    });
  }

  rateLimiter.record(normalizedEmail);

  let code;
  if (process.env.NODE_ENV !== "production" && TEST_IDENTIFIERS[normalizedEmail]) {
    code = TEST_IDENTIFIERS[normalizedEmail];
  } else {
    code = generateCode();
  }

  const codeHash = hashCode(code);
  const expiresAt = getExpiryTime();
  const codeId = crypto.randomUUID();

  await db.prepare(
    `INSERT INTO verification_codes (id, pending_user_id, destination, code_hash, expires_at, attempts)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(codeId, user.id, normalizedEmail, codeHash, expiresAt, 0);

  await deliveryProvider.sendEmail(normalizedEmail, code);

  res.json({
    message: "Login code sent to your email.",
    email: normalizedEmail
  });
});

router.post("/verify-email", async (req, res) => {
  const { pendingUserId, code } = req.body || {};

  if (!pendingUserId || !code) {
    return res.status(400).json({ error: "pendingUserId and code are required" });
  }

  try {
    // Look up pending user
    const user = await db.prepare("SELECT * FROM users WHERE id = ? AND status = 'pending'").get(pendingUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found or already verified" });
    }

    // Look up latest non-consumed, non-expired code
    const verificationRecord = await db.prepare(
      `SELECT * FROM verification_codes 
       WHERE pending_user_id = ? AND consumed_at IS NULL
       ORDER BY created_at DESC LIMIT 1`
    ).get(pendingUserId);

    if (!verificationRecord) {
      return res.status(400).json({ error: "No active verification code found. Request a new one." });
    }

    // Check if expired
    if (isExpired(verificationRecord.expires_at)) {
      return res.status(400).json({ error: "Verification code expired. Request a new one." });
    }

    // Check if max attempts exceeded
    if (verificationRecord.attempts >= 5) {
      return res.status(400).json({ error: "Too many failed attempts. Request a new code." });
    }

    // Verify code
    if (!verifyCode(code, verificationRecord.code_hash)) {
      // Increment attempts on failure
      await db.prepare("UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?").run(verificationRecord.id);
      return res.status(400).json({ error: "Invalid verification code. Try again." });
    }

    // Success: mark code as consumed and activate user
    await db.prepare("UPDATE verification_codes SET consumed_at = datetime('now') WHERE id = ?").run(verificationRecord.id);
    await db.prepare("UPDATE users SET email_verified_at = datetime('now'), status = 'active' WHERE id = ?").run(pendingUserId);

    // Fetch updated user and issue token
    const activatedUser = await db.prepare("SELECT * FROM users WHERE id = ?").get(pendingUserId);
    const token = signToken(activatedUser);

    res.json({
      token,
      user: publicUser(activatedUser),
      message: "Email verified successfully! You can now log in."
    });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

router.post("/resend-code", async (req, res) => {
  const { pendingUserId } = req.body || {};

  if (!pendingUserId) {
    return res.status(400).json({ error: "pendingUserId is required" });
  }

  try {
    // Look up pending user
    const user = await db.prepare("SELECT * FROM users WHERE id = ? AND status = 'pending'").get(pendingUserId);
    if (!user) {
      return res.status(404).json({ error: "User not found or already verified" });
    }

    const email = user.school_email;

    // Rate limit: max 5 sends per hour per email
    const rateLimitCheck = rateLimiter.check(email, 5, 60 * 60 * 1000);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        error: `Too many code requests. Try again in ${Math.ceil((rateLimitCheck.resetAt - new Date()) / 1000)} seconds.`
      });
    }

    // Record this request for rate limiting
    rateLimiter.record(email);

    // Generate new code
    let code;
    if (process.env.NODE_ENV !== "production" && TEST_IDENTIFIERS[email]) {
      code = TEST_IDENTIFIERS[email];
    } else {
      code = generateCode();
    }

    const codeHash = hashCode(code);
    const expiresAt = getExpiryTime();
    const codeId = crypto.randomUUID();

    // Insert new code (old code naturally expires)
    await db.prepare(
      `INSERT INTO verification_codes (id, pending_user_id, destination, code_hash, expires_at, attempts)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(codeId, pendingUserId, email, codeHash, expiresAt, 0);

    // Send verification code
    await deliveryProvider.sendEmail(email, code);

    res.json({
      message: "Verification code sent to your email.",
      email: email
    });
  } catch (err) {
    console.error("Resend code error:", err);
    res.status(500).json({ error: "Failed to send code. Please try again." });
  }
});

router.post("/cancel-registration", async (req, res) => {
  const { pendingUserId } = req.body || {};

  if (!pendingUserId) {
    return res.status(400).json({ error: "pendingUserId is required" });
  }

  try {
    // Verify the user exists and is pending
    const user = await db.prepare("SELECT * FROM users WHERE id = ? AND status = 'pending'").get(pendingUserId);
    if (!user) {
      return res.json({ message: "Registration already cancelled" });
    }

    // Delete verification codes first (foreign key constraint)
    await db.prepare("DELETE FROM verification_codes WHERE pending_user_id = ?").run(pendingUserId);

    // Delete the pending user
    await db.prepare("DELETE FROM users WHERE id = ?").run(pendingUserId);

    res.json({ message: "Registration cancelled successfully" });
  } catch (err) {
    console.error("Cancel registration error:", err);
    res.status(500).json({ error: "Failed to cancel registration. Please try again." });
  }
});

module.exports = router;
