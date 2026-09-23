CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, year TEXT, concentration TEXT, about_me TEXT,
  profile_image TEXT, profile_image_public_id TEXT, school_email TEXT UNIQUE,
  phone_number TEXT UNIQUE, email_verified_at TEXT, status TEXT DEFAULT 'active',
  online_status TEXT NOT NULL DEFAULT 'offline' CHECK (online_status IN ('online', 'offline')),
  last_seen_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, seller_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, description TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  category TEXT NOT NULL, condition TEXT NOT NULL CHECK (condition IN ('new','like-new','used')),
  images_json TEXT NOT NULL DEFAULT '[]', image_public_ids_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','pending','sold')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status, created_at);
CREATE INDEX IF NOT EXISTS idx_items_seller ON items(seller_id);
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, item_id TEXT NOT NULL REFERENCES items(id),
  user_a_id TEXT NOT NULL REFERENCES users(id), user_b_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(item_id, user_a_id, user_b_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_item ON conversations(item_id);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE TABLE IF NOT EXISTS verification_codes (
  id TEXT PRIMARY KEY, pending_user_id TEXT NOT NULL REFERENCES users(id),
  destination TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_verification_codes_pending_user ON verification_codes(pending_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE TABLE IF NOT EXISTS approved_domains (domain TEXT PRIMARY KEY, school_name TEXT NOT NULL);
