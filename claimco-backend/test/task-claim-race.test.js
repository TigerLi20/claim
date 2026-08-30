const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { splitPayment } = require('../src/lib/money');

function loadConversationUtils(dbPath) {
  process.env.DATABASE_PATH = dbPath;
  delete require.cache[require.resolve('../src/db')];
  delete require.cache[require.resolve('../src/lib/conversations')];
  return require('../src/lib/conversations');
}

function setupDb() {
  const dbPath = path.join(__dirname, '..', 'tmp-race-test.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8'));

  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .run('r1', 'requester@example.com', 'pw', 'Requester');
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .run('w1', 'worker1@example.com', 'pw', 'Worker 1');
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .run('w2', 'worker2@example.com', 'pw', 'Worker 2');
  db.prepare("INSERT INTO tasks (id, category, title, description, price_cents, requester_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run('t1', 'errand', 'Task', 'desc', 1000, 'r1', 'open');

  return db;
}

async function submitClaim(db, taskId, workerId) {
  return new Promise((resolve, reject) => {
    try {
      const result = db.transaction(() => {
        const latestTask = db.prepare('SELECT status, requester_id FROM tasks WHERE id = ?').get(taskId);
        if (!latestTask || latestTask.status !== 'open') {
          const error = new Error('Task is no longer open');
          error.statusCode = 409;
          throw error;
        }

        const existing = db.prepare('SELECT status FROM task_applications WHERE task_id = ? AND worker_id = ?').get(taskId, workerId);
        if (existing?.status === 'pending') {
          const error = new Error('Your request is already pending');
          error.statusCode = 409;
          throw error;
        }
        if (existing?.status === 'declined') {
          const error = new Error('Your request was declined');
          error.statusCode = 409;
          throw error;
        }

        const id = crypto.randomUUID();
        db.prepare('INSERT INTO task_applications (id, task_id, worker_id, anonymous, request_note) VALUES (?, ?, ?, ?, ?)')
          .run(id, taskId, workerId, 0, '');
        db.prepare("INSERT INTO notifications (id, recipient_id, type, task_id, actor_id, message) VALUES (?, ?, 'task_application', ?, ?, ?)")
          .run(crypto.randomUUID(), latestTask.requester_id, taskId, workerId, 'Someone wants to claim your ticket.');
        return id;
      })();

      resolve(result);
    } catch (error) {
      if (error.statusCode === 409 || error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        resolve('already-pending');
        return;
      }
      reject(error);
    }
  });
}

test('two simultaneous claim attempts produce only one pending application and no crash', async () => {
  const db = setupDb();

  try {
    const results = await Promise.all([
      submitClaim(db, 't1', 'w1'),
      submitClaim(db, 't1', 'w2'),
    ]);

    const rows = db.prepare('SELECT task_id, worker_id, status FROM task_applications WHERE task_id = ? ORDER BY worker_id').all('t1');
    const pendingCount = db.prepare("SELECT COUNT(*) AS count FROM task_applications WHERE task_id = ? AND status = 'pending'").get('t1').count;

    assert.equal(results.length, 2, 'both attempts should resolve');
    assert.equal(rows.length, 2, 'two different workers can both claim concurrently');
    assert.equal(pendingCount, 2, 'both requests remain pending without a duplicate or crash');
  } finally {
    db.close();
    const dbPath = path.join(__dirname, '..', 'tmp-race-test.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }
});

test('fulfilled payouts are the full task total with no platform cut', () => {
  const { platformCutCents, workerPayoutCents } = splitPayment(1000);

  assert.equal(platformCutCents, 0, 'platform should receive no cut');
  assert.equal(workerPayoutCents, 1000, 'worker should receive the full task total');
});

test('confirmed task conversations remain readable and messageable after completion', () => {
  const dbPath = path.join(__dirname, '..', 'tmp-fulfilled-chat.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8'));

  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run('u1', 'u1@example.com', 'pw', 'User 1');
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run('u2', 'u2@example.com', 'pw', 'User 2');
  db.prepare("INSERT INTO conversations (id, user_a_id, user_b_id) VALUES (?, ?, ?)").run(42, 'u1', 'u2');
  db.prepare("INSERT INTO tasks (id, category, title, description, price_cents, requester_id, worker_id, status, requester_completed, worker_completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('task_done', 'errand', 'Task', 'desc', 1500, 'u1', 'u2', 'done', 1, 1);
  db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)")
    .run(42, 'u1', 'Old message');

  try {
    const { canAccessConversation } = loadConversationUtils(dbPath);
    assert.equal(canAccessConversation(42, 'u1'), true, 'completed conversation remains visible');
    assert.equal(canAccessConversation(42, 'u2'), true, 'the other participant can still access the chat');
  } finally {
    db.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  }
});

test('dashboard stats are scoped to the authenticated user', () => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8'));

  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run('alice', 'alice@example.com', 'pw', 'Alice');
  db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run('bob', 'bob@example.com', 'pw', 'Bob');
  db.prepare("INSERT INTO tasks (id, category, title, description, price_cents, requester_id, worker_id, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('t1', 'errand', 'Task 1', 'desc', 1000, 'alice', 'bob', 'done', '2026-01-01T00:00:00Z');
  db.prepare("INSERT INTO tasks (id, category, title, description, price_cents, requester_id, worker_id, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('t2', 'errand', 'Task 2', 'desc', 2000, 'alice', null, 'open', null);
  db.prepare("INSERT INTO tasks (id, category, title, description, price_cents, requester_id, worker_id, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('t3', 'errand', 'Task 3', 'desc', 3000, 'bob', 'alice', 'done', '2026-01-01T00:00:00Z');
  db.prepare("INSERT INTO tasks (id, category, title, description, price_cents, requester_id, worker_id, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('t4', 'errand', 'Task 4', 'desc', 4000, 'bob', null, 'claimed', null);
  db.prepare("INSERT INTO services (id, category, title, description, price_cents, provider_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run('s1', 'academic', 'Tutor Service 1', 'desc', 1500, 'alice', 'active');
  db.prepare("INSERT INTO services (id, category, title, description, price_cents, provider_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run('s2', 'academic', 'Tutor Service 2', 'desc', 2000, 'alice', 'inactive');
  db.prepare("INSERT INTO services (id, category, title, description, price_cents, provider_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run('s3', 'academic', 'Tutor Service 3', 'desc', 2500, 'bob', 'active');
  db.prepare("INSERT INTO service_purchases (id, service_id, buyer_id, purchase_type, confirmation_status, status, provider_completed, buyer_completed, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('p1', 's1', 'bob', 'one_time', 'confirmed', 'used', 1, 1, 1500);
  db.prepare("INSERT INTO service_purchases (id, service_id, buyer_id, purchase_type, confirmation_status, status, provider_completed, buyer_completed, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('p2', 's2', 'bob', 'one_time', 'confirmed', 'used', 0, 1, 2000);
  db.prepare("INSERT INTO service_purchases (id, service_id, buyer_id, purchase_type, confirmation_status, status, provider_completed, buyer_completed, price_cents) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run('p3', 's3', 'alice', 'one_time', 'confirmed', 'used', 1, 1, 3000);

  const { getDashboardStatsForUser } = require('../src/routes/dashboard');
  const stats = getDashboardStatsForUser('alice', db);

  assert.deepEqual(stats, {
    cutRate: 0,
    postedCount: 2,
    earned: 30,
    openCount: 1,
    claimedCount: 0,
    doneCount: 1,
    fulfilledCount: 1,
    tutoringOfferedCount: 2,
    tutoringFulfilledCount: 1,
    tutoringEarned: 15,
  }, 'dashboard totals should reflect only the authenticated user');

  db.close();
});

test('task detail visibility allows public open tickets but blocks unrelated private tickets', () => {
  const { canViewTask } = require('../src/routes/tasks');

  assert.equal(canViewTask({ requester_id: 'alice', worker_id: null, status: 'open' }, 'bob'), true, 'open tasks remain visible to logged-in users');
  assert.equal(canViewTask({ requester_id: 'alice', worker_id: null, status: 'claimed' }, 'bob'), false, 'claimed tasks are private to the participants');
  assert.equal(canViewTask({ requester_id: 'alice', worker_id: 'bob', status: 'done' }, 'bob'), true, 'participants can still access their own completed tasks');
  assert.equal(canViewTask({ requester_id: 'alice', worker_id: 'charlie', status: 'done' }, 'bob'), false, 'unrelated users cannot access someone else\'s completed task');
});
