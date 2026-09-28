const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const jwt = require("jsonwebtoken");
const express = require("express");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claim-safety-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.JWT_SECRET = "safety-test-secret";
const db = require("../src/db");
const app = express();
app.use(express.json());
app.use("/auth", require("../src/routes/auth"));
app.use("/items", require("../src/routes/items"));
app.use("/safety", require("../src/routes/safety"));
app.use("/conversations", require("../src/routes/conversations"));
app.use("/devices", require("../src/routes/devices"));

test("reports, blocks, and deletion protect both sides of a conversation", async () => {
  const seller = randomUUID(), buyer = randomUUID();
  for (const [id, name] of [[seller, "Seller"], [buyer, "Buyer"]]) db.prepare("INSERT INTO users (id, name, email, password_hash, status) VALUES (?, ?, ?, '', 'active')").run(id, name, `${id}@brown.edu`);
  const server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(userId, route, method = "GET", body) {
    const headers = { "Content-Type": "application/json" };
    if (userId) headers.Authorization = `Bearer ${jwt.sign({ sub: userId }, process.env.JWT_SECRET)}`;
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return [response.status, await response.json()];
  }
  try {
    const [, item] = await request(seller, "/items", "POST", { title: "Lamp", description: "Desk lamp", price: 12, category: "home", condition: "used", images: [] });
    const [, inquiry] = await request(buyer, `/items/${item.id}/interest`, "POST");
    assert.equal((await request(buyer, "/safety/reports", "POST", { targetType: "item", targetId: item.id, reason: "scam", details: "Test" }))[0], 201);
    assert.equal((await request(buyer, "/safety/reports"))[0], 403);
    assert.equal((await request(buyer, `/safety/blocks/${seller}`, "PUT"))[0], 200);
    assert.equal((await request(buyer, `/items/${item.id}/interest`, "POST"))[0], 403);
    assert.equal((await request(buyer, `/conversations/${inquiry.conversationId}/messages`))[0], 404);
    assert.equal((await request(seller, "/conversations"))[1].length, 0);
    assert.equal((await request(buyer, `/safety/blocks/${seller}`, "DELETE"))[0], 200);
    assert.equal((await request(buyer, `/items/${item.id}/interest`, "POST"))[0], 200);
    assert.equal((await request(seller, "/devices/push-token", "POST", { token: "test-push-token-for-seller-123456", platform: "android" }))[0], 200);
    assert.equal((await request(seller, "/auth/me", "DELETE"))[0], 200);
    assert.equal(db.prepare("SELECT COUNT(*) AS total FROM device_tokens WHERE user_id = ?").get(seller).total, 0);
    assert.equal((await request(seller, "/auth/me"))[0], 401);
    assert.equal((await request(buyer, "/conversations"))[1].length, 0);
    assert.equal((await request(null, `/items/${item.id}`))[0], 404);
  } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(dir, { recursive: true, force: true }); }
});
