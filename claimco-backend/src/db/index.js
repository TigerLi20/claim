const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "..", "dev.db");
const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Keep existing local databases compatible with additive schema changes.
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map((column) => column.name);
if (!taskColumns.includes("requester_anonymous")) {
    db.exec("ALTER TABLE tasks ADD COLUMN requester_anonymous INTEGER NOT NULL DEFAULT 0");
}
if (!taskColumns.includes("worker_anonymous")) {
    db.exec("ALTER TABLE tasks ADD COLUMN worker_anonymous INTEGER NOT NULL DEFAULT 0");
}
if (!taskColumns.includes("images_json")) {
    db.exec("ALTER TABLE tasks ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]'");
}
if (!taskColumns.includes("scheduled_at")) {
    db.exec("ALTER TABLE tasks ADD COLUMN scheduled_at TEXT");
}
if (!taskColumns.includes("location")) {
    db.exec("ALTER TABLE tasks ADD COLUMN location TEXT");
}
if (!taskColumns.includes("notes")) {
    db.exec("ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
}
if (!taskColumns.includes("requester_completed")) {
    db.exec("ALTER TABLE tasks ADD COLUMN requester_completed INTEGER NOT NULL DEFAULT 0");
}
if (!taskColumns.includes("worker_completed")) {
    db.exec("ALTER TABLE tasks ADD COLUMN worker_completed INTEGER NOT NULL DEFAULT 0");
}
db.exec("UPDATE tasks SET requester_completed = 1, worker_completed = 1 WHERE status = 'done'");

const serviceColumns = db.prepare("PRAGMA table_info(services)").all().map((column) => column.name);
if (!serviceColumns.includes("images_json")) {
    db.exec("ALTER TABLE services ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]'");
}

const taskApplicationColumns = db.prepare("PRAGMA table_info(task_applications)").all().map((column) => column.name);
if (!taskApplicationColumns.includes("request_note")) {
    db.exec("ALTER TABLE task_applications ADD COLUMN request_note TEXT NOT NULL DEFAULT ''");
}

// Support messages table (dev tools)
db.exec(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    message TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    resolved INTEGER DEFAULT 0
  )
`);

const serviceTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'services'").get()?.sql || "";
if (!serviceTableSql.includes("'academic'")) {
    db.pragma("foreign_keys = OFF");
    db.exec(`
                BEGIN;
                CREATE TABLE services_migrated (
                    id            TEXT PRIMARY KEY,
                    category      TEXT NOT NULL CHECK (category IN ('academic', 'careers', 'creative', 'other')),
                    title         TEXT NOT NULL,
                    description   TEXT NOT NULL DEFAULT '',
                    images_json   TEXT NOT NULL DEFAULT '[]',
                    price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
                    price_unit    TEXT NOT NULL DEFAULT 'per booking',
                    provider_id   TEXT NOT NULL REFERENCES users(id),
                    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
                    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
                );
                INSERT INTO services_migrated (id, category, title, description, images_json, price_cents, price_unit, provider_id, status, created_at)
                SELECT id,
                    CASE category
                        WHEN 'moveout' THEN 'other'
                        WHEN 'errand' THEN 'other'
                        WHEN 'event' THEN 'other'
                        ELSE category
                    END,
                    title, description, images_json, price_cents, price_unit, provider_id, status, created_at
                FROM services;
                DROP TABLE services;
                ALTER TABLE services_migrated RENAME TO services;
                CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
                CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);
                COMMIT;
        `);
    db.pragma("foreign_keys = ON");
}

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
if (!userColumns.includes("year")) {
    db.exec("ALTER TABLE users ADD COLUMN year TEXT");
}
if (!userColumns.includes("concentration")) {
    db.exec("ALTER TABLE users ADD COLUMN concentration TEXT");
}
if (!userColumns.includes("about_me")) {
    db.exec("ALTER TABLE users ADD COLUMN about_me TEXT");
}
if (!userColumns.includes("profile_image")) {
    db.exec("ALTER TABLE users ADD COLUMN profile_image TEXT");
}
if (!userColumns.includes("school_email")) {
    db.exec("ALTER TABLE users ADD COLUMN school_email TEXT UNIQUE");
}
if (!userColumns.includes("phone_number")) {
    db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT UNIQUE");
}
if (!userColumns.includes("email_verified_at")) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
}
if (!userColumns.includes("status")) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
    // Set all existing users to 'active' status
    db.exec("UPDATE users SET status = 'active' WHERE status IS NULL");
}

// Seed approved_domains table if empty
const domainsCount = db.prepare("SELECT COUNT(*) as count FROM approved_domains").get().count;
if (domainsCount === 0) {
    db.prepare("INSERT INTO approved_domains (domain, school_name) VALUES (?, ?)").run('brown.edu', 'Brown University');
}

const purchaseColumns = db.prepare("PRAGMA table_info(service_purchases)").all().map((column) => column.name);
if (!purchaseColumns.includes("confirmation_status")) {
    db.exec("ALTER TABLE service_purchases ADD COLUMN confirmation_status TEXT NOT NULL DEFAULT 'confirmed'");
}
if (!purchaseColumns.includes("request_note")) {
    db.exec("ALTER TABLE service_purchases ADD COLUMN request_note TEXT NOT NULL DEFAULT ''");
}

const reviewColumns = db.prepare("PRAGMA table_info(reviews)").all().map((column) => column.name);
if (reviewColumns.length && !reviewColumns.includes("anonymous")) {
    db.exec("ALTER TABLE reviews ADD COLUMN anonymous INTEGER NOT NULL DEFAULT 0");
}

const messageColumns = db.prepare("PRAGMA table_info(messages)").all().map((column) => column.name);
if (messageColumns.length && !messageColumns.includes("read_at")) {
    db.exec("ALTER TABLE messages ADD COLUMN read_at TEXT");
}
if (!purchaseColumns.includes("provider_completed")) {
    db.exec("ALTER TABLE service_purchases ADD COLUMN provider_completed INTEGER NOT NULL DEFAULT 0");
}
if (!purchaseColumns.includes("buyer_completed")) {
    db.exec("ALTER TABLE service_purchases ADD COLUMN buyer_completed INTEGER NOT NULL DEFAULT 0");
}

db.exec("UPDATE services SET price_unit = 'per booking' WHERE price_unit != 'per booking'");

module.exports = db;
