const test = require('node:test');
const assert = require('node:assert/strict');
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'listing-test-secret';
const db = require('../src/db');
const { expiryAfterFourMonths, cleanupExpiredListings } = require('../src/lib/listingCleanup');
const express = require('express');
const jwt = require('jsonwebtoken');

test('four calendar months clamp month-end dates', () => {
  assert.equal(expiryAfterFourMonths(new Date('2026-10-31T12:00:00Z')).toISOString(), '2027-02-28T12:00:00.000Z');
});

test('unlisting preserves photos and chats, relisting cancels expiry, cleanup deletes expired data', async () => {
  db.prepare("INSERT INTO users (id,name,email,password_hash) VALUES ('seller','Seller','seller@test.com','hash'), ('buyer','Buyer','buyer@test.com','hash')").run();
  db.prepare("INSERT INTO items (id,seller_id,title,description,price_cents,category,condition,images_json,image_public_ids_json) VALUES ('item','seller','Desk','A desk',1000,'furniture','used','[\"photo\"]','[\"asset\"]')").run();
  db.prepare("INSERT INTO conversations (item_id,user_a_id,user_b_id) VALUES ('item','buyer','seller')").run();
  db.prepare("INSERT INTO messages (conversation_id,sender_id,body) VALUES (1,'buyer','Hello')").run();
  const app = express(); app.use(express.json()); app.use('/items', require('../src/routes/items'));
  const server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/items`;
  const headers = { Authorization: `Bearer ${jwt.sign({ sub: 'seller' }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' };
  try {
    const removed = await fetch(`${base}/item`, { method: 'DELETE', headers });
    assert.equal(removed.status, 200); assert.equal((await removed.json()).status, 'removed');
    const firstExpiry = db.prepare("SELECT expires_at FROM items WHERE id='item'").get().expires_at;
    await fetch(`${base}/item`, { method: 'DELETE', headers });
    assert.equal(db.prepare("SELECT expires_at FROM items WHERE id='item'").get().expires_at, firstExpiry);
    assert.equal((await (await fetch(base)).json()).length, 0);
    assert.equal((await (await fetch(`${base}/mine/listings`, { headers })).json()).length, 1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM messages').get().n, 1);
    const blocked = await fetch(`${base}/item`, { method: 'DELETE', headers: { Authorization: `Bearer ${jwt.sign({ sub: 'buyer' }, process.env.JWT_SECRET)}` } });
    assert.equal(blocked.status, 403);
    const relisted = await fetch(`${base}/item/status`, { method: 'PATCH', headers, body: JSON.stringify({ status: 'available' }) });
    assert.equal((await relisted.json()).status, 'available');
    await cleanupExpiredListings(new Date('2030-01-01'));
    assert.ok(db.prepare("SELECT id FROM items WHERE id='item'").get());
    await fetch(`${base}/item`, { method: 'DELETE', headers });
    await cleanupExpiredListings(new Date(new Date(db.prepare("SELECT expires_at FROM items WHERE id='item'").get().expires_at).getTime() - 1));
    assert.ok(db.prepare("SELECT id FROM items WHERE id='item'").get());
    await cleanupExpiredListings(new Date('2030-01-01'));
    assert.equal(db.prepare('SELECT count(*) AS n FROM items').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) AS n FROM messages').get().n, 0);
    assert.equal(db.prepare('SELECT count(*) AS n FROM conversations').get().n, 0);
    assert.equal(db.prepare('SELECT id FROM image_cleanup_queue').get().id, 'asset');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
