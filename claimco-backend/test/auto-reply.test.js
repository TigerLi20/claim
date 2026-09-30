const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claim-auto-reply-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
const db = require("../src/db");
const { createAutoReply } = require("../src/lib/autoReply");

test("configured sellers send one automatic answer per item conversation", async () => {
    const seller = randomUUID();
    const buyer = randomUUID();
    db.prepare("INSERT INTO users (id, name, email, password_hash, status, auto_reply_text) VALUES (?, ?, ?, '', 'active', ?)")
        .run(seller, "Bookstore", `${seller}@brown.edu`, "Thanks for asking! I will get back to you soon.");
    db.prepare("INSERT INTO users (id, name, email, password_hash, status) VALUES (?, ?, ?, '', 'active')")
        .run(buyer, "Buyer", `${buyer}@brown.edu`);

    function conversation(title) {
        const itemId = randomUUID();
        db.prepare("INSERT INTO items (id, seller_id, title, description, price_cents, category, condition) VALUES (?, ?, ?, 'Description', 100, 'books', 'used')")
            .run(itemId, seller, title);
        return db.prepare("INSERT INTO conversations (item_id, user_a_id, user_b_id) VALUES (?, ?, ?)").run(itemId, buyer, seller).lastInsertRowid;
    }

    const first = conversation("First book");
    db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, 'Is this available?')").run(first, buyer);
    const reply = await createAutoReply(first, buyer);
    assert.equal(reply?.senderId, seller);
    assert.equal(reply?.isAutoReply, true);
    assert.equal(await createAutoReply(first, buyer), null);
    assert.equal(await createAutoReply(first, seller), null);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ? AND is_auto_reply = 1").get(first).count, 1);

    const second = conversation("Second book");
    db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, 'Personally answered')").run(second, seller);
    assert.equal(await createAutoReply(second, buyer), null);

    const third = conversation("Third book");
    db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, 'Hello')").run(third, buyer);
    const simultaneousReplies = await Promise.all([createAutoReply(third, buyer), createAutoReply(third, buyer)]);
    assert.equal(simultaneousReplies.filter(Boolean).length, 1);
    assert.equal(simultaneousReplies.find(Boolean)?.senderId, seller);
    db.prepare("UPDATE users SET auto_reply_text = NULL WHERE id = ?").run(seller);
    const fourth = conversation("Fourth book");
    assert.equal(await createAutoReply(fourth, buyer), null);

    const duplicate = db.prepare("INSERT INTO messages (conversation_id, sender_id, body, is_auto_reply) VALUES (?, ?, 'duplicate', 1) ON CONFLICT DO NOTHING").run(first, seller);
    assert.equal(duplicate.changes, 0);
});

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
