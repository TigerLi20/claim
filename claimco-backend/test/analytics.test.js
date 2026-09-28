const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");
const express = require("express");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claim-analytics-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.JWT_SECRET = "analytics-test-secret";
process.env.ANALYTICS_ADMIN_EMAILS = "tiger_li@brown.edu";
const db = require("../src/db");
const analytics = require("../src/routes/analytics");
const items = require("../src/routes/items");
const app = express();
app.use(express.json());
app.use("/analytics", analytics);
app.use("/items", items);

test("private marketplace metrics use existing records and anonymous counters", async () => {
  const admin = randomUUID(), seller = randomUUID(), buyer = randomUUID();
  for (const [id, email] of [[admin, "tiger_li@brown.edu"], [seller, "seller@brown.edu"], [buyer, "buyer@risd.edu"]]) {
    db.prepare("INSERT INTO users (id, name, email, password_hash, status) VALUES (?, ?, ?, '', 'active')").run(id, "Student", email);
  }
  const server = app.listen(0); await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, method = "GET", body, userId) {
    const headers = { "Content-Type": "application/json" };
    if (userId) headers.Authorization = `Bearer ${jwt.sign({ sub: userId }, process.env.JWT_SECRET)}`;
    const response = await fetch(base + route, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return [response.status, response.status === 204 ? null : await response.json()];
  }
  try {
    assert.equal((await request("/analytics/summary"))[0], 401);
    assert.equal((await request("/analytics/summary", "GET", undefined, seller))[0], 403);
    const [, item] = await request("/items", "POST", { title: "Lamp", description: "Working", price: 12.5, category: "home", condition: "used", images: [] }, seller);
    const [, inquiry] = await request(`/items/${item.id}/interest`, "POST", undefined, buyer);
    assert.equal((await request(`/items/${item.id}/status`, "PATCH", { status: "sold" }, seller))[0], 200);
    assert.ok(db.prepare("SELECT sold_at FROM items WHERE id = ?").get(item.id).sold_at);
    await request("/analytics/item-view", "POST");
    await request("/analytics/item-view", "POST");
    const clicked = randomUUID(), exited = randomUUID();
    await request(`/analytics/search-sessions/${clicked}/opened`, "POST");
    await request("/analytics/search-sessions", "POST", { id: clicked });
    await request("/analytics/search-sessions", "POST", { id: exited });
    const oldSearchTime = new Date(Date.now() - 31 * 60 * 1000);
    db.prepare("UPDATE analytics_search_sessions SET created_at = ? WHERE id = ?").run(oldSearchTime.toISOString().slice(0, 19).replace("T", " "), exited);
    assert.equal((await request("/analytics/search-sessions", "POST", { id: "not-a-uuid" }))[0], 400);
    db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)").run(inquiry.conversationId, buyer, "Is it available?");
    db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)").run(inquiry.conversationId, seller, "Yes");

    const [status, result] = await request("/analytics/summary", "GET", undefined, admin);
    assert.equal(status, 200);
    assert.equal(result.accounts, 3);
    assert.deepEqual(result.listings, { total: 1, available: 0, pending: 0, sold: 1, soldPercent: 100 });
    assert.equal(result.estimatedGmvCents, 1250);
    const oldSearchIsThisMonth = oldSearchTime.toISOString().slice(0, 7) === new Date().toISOString().slice(0, 7);
    assert.deepEqual(result.search, oldSearchIsThisMonth ? { sessions: 2, exits: 1, exitRate: 50 } : { sessions: 1, exits: 0, exitRate: 0 });
    assert.deepEqual(result.inquiries, { itemViews: 2, newConversations: 1, rate: 50, averageMessages: 2 });

    const activeSearch = randomUUID();
    await request("/analytics/search-sessions", "POST", { id: activeSearch });
    const [, whileActive] = await request("/analytics/summary", "GET", undefined, admin);
    assert.deepEqual(whileActive.search, result.search);
    await request(`/analytics/search-sessions/${activeSearch}/opened`, "POST");
    const [, afterClick] = await request("/analytics/summary", "GET", undefined, admin);
    assert.equal(afterClick.search.sessions, result.search.sessions + 1);
    assert.equal(afterClick.search.exits, result.search.exits);

    await request(`/items/${item.id}/status`, "PATCH", { status: "available" }, seller);
    const [, afterReopen] = await request("/analytics/summary", "GET", undefined, admin);
    assert.equal(afterReopen.estimatedGmvCents, 0);
    assert.equal(afterReopen.listings.soldPercent, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
