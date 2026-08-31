const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cors = require("cors");

const dbModule = require("../src/db");
const { isValidImageString, normalizeImageValue } = require("../src/lib/cloudinary");
const authRoutes = require("../src/routes/auth");

test("SQLite-specific SQL is translated to Postgres-compatible SQL", () => {
    const translated = dbModule.translateSqliteToPostgres(
        "UPDATE tasks SET cancelled_at = datetime('now') WHERE id = ? AND date(?) < date('now', 'localtime') AND instr(scheduled_at, 'T') = 0 AND datetime(?, 'auto') < datetime('now', 'localtime', '+10 minutes')"
    );

    assert.match(translated, /CURRENT_TIMESTAMP|NOW\(\)/);
    assert.match(translated, /\$1/);
    assert.match(translated, /POSITION\('T' IN scheduled_at\)|POSITION\('T' IN \$2\)/);
    assert.doesNotMatch(translated, /date\('now', 'localtime'\)/i);
    assert.doesNotMatch(translated, /instr\s*\(/i);
    assert.doesNotMatch(translated, /datetime\(\?, 'auto'\)/i);
    assert.doesNotMatch(translated, /\?/);
});

test("Postgres translation preserves identity columns and purchase windows", () => {
    const translated = dbModule.translateSqliteToPostgres(`
    CREATE TABLE conversations (id INTEGER PRIMARY KEY AUTOINCREMENT);
    SELECT 1 FROM service_purchases
    WHERE julianday('now') - julianday(created_at) < 1;
  `);

    assert.match(translated, /BIGSERIAL PRIMARY KEY/);
    assert.match(translated, /created_at > NOW\(\) - INTERVAL '1 day'/);
    assert.doesNotMatch(translated, /INTEGER PRIMARY KEY GENERATED/);
});

test("Image validation accepts remote URLs and legacy base64 values", () => {
    const cloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/v123/sample.jpg";
    const dataUrl = "data:image/jpeg;base64,abcd";
    const nonImageUrl = "https://example.com/not-an-image";

    assert.equal(isValidImageString(cloudinaryUrl), true);
    assert.equal(isValidImageString(dataUrl), true);
    assert.equal(isValidImageString(nonImageUrl), false);
    assert.equal(normalizeImageValue(cloudinaryUrl), cloudinaryUrl);
    assert.equal(normalizeImageValue(dataUrl), dataUrl);
});

test("Profile image updates can omit name and retain the current user name", async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    await dbModule.ready;

    const userId = crypto.randomUUID();
    await dbModule.prepare("DELETE FROM users WHERE email = ?").run("profile-image-regression@test.com");
    await dbModule.prepare(`
        INSERT INTO users (id, name, email, password_hash, school_email, phone_number, year, concentration, status, email_verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId,
        "Existing Name",
        "profile-image-regression@test.com",
        "hash",
        "profile-image-regression@test.com",
        "+15550001111",
        "freshman",
        "CS",
        "active",
        new Date().toISOString()
    );

    const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: "8mb" }));
    app.use("/auth", authRoutes);

    await new Promise((resolve, reject) => {
        const server = app.listen(3014, async () => {
            try {
                const body = new FormData();
                body.append("profileImage", new Blob(["hello"], { type: "image/png" }), "avatar.png");

                const res = await fetch("http://localhost:3014/auth/profile", {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                    body,
                });

                const data = await res.json();
                assert.equal(res.status, 200, JSON.stringify(data));
                assert.equal(data.user.name, "Existing Name");
                assert.ok(data.user.profileImage);
                server.close(() => resolve());
            } catch (error) {
                server.close(() => reject(error));
            }
        });
        server.on("error", reject);
    });
});
