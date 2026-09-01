-- A person on the platform. No separate account "type" — the same student
-- posts tasks sometimes and claims them other times, same as real campus life.
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  password_hash     TEXT NOT NULL,
  year              TEXT,
  concentration     TEXT,
  about_me          TEXT,
  profile_image     TEXT,
  profile_image_public_id TEXT,
  stripe_account_id TEXT,
  stripe_onboarded  INTEGER NOT NULL DEFAULT 0,
  school_email      TEXT UNIQUE,
  phone_number      TEXT UNIQUE,
  email_verified_at TEXT,
  status            TEXT DEFAULT 'active',
  online_status     TEXT NOT NULL DEFAULT 'offline' CHECK (online_status IN ('online', 'offline')),
  last_seen_at      TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A single job on the board ("ticket" in the product language).
-- Lifecycle: open -> claimed -> done, or open/claimed -> cancelled.
CREATE TABLE IF NOT EXISTS tasks (
  id                  TEXT PRIMARY KEY,
  category            TEXT NOT NULL CHECK (category IN ('moveout', 'errand', 'event', 'other')),
  title               TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  scheduled_at        TEXT,
  location            TEXT,
  notes               TEXT NOT NULL DEFAULT '',
  images_json         TEXT NOT NULL DEFAULT '[]',
  image_public_ids_json TEXT NOT NULL DEFAULT '[]',
  price_cents         INTEGER NOT NULL CHECK (price_cents > 0),
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','done','cancelled')),

  requester_id        TEXT NOT NULL REFERENCES users(id),
  requester_anonymous INTEGER NOT NULL DEFAULT 0,
  worker_id           TEXT REFERENCES users(id),
  worker_anonymous    INTEGER NOT NULL DEFAULT 0,
  requester_completed INTEGER NOT NULL DEFAULT 0,
  worker_completed    INTEGER NOT NULL DEFAULT 0,

  -- Stripe PaymentIntent id, captured (held) at post time.
  payment_intent_id   TEXT,
  platform_cut_cents  INTEGER,
  worker_payout_cents INTEGER,

  claimed_at          TEXT,
  completed_at        TEXT,
  cancelled_at        TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_requester ON tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_worker ON tasks(worker_id);

-- An ongoing offer someone can provide repeatedly. Unlike a task, a service
-- does not move through a claim/fulfillment lifecycle.
CREATE TABLE IF NOT EXISTS services (
  id            TEXT PRIMARY KEY,
  category      TEXT NOT NULL CHECK (category IN ('academic', 'careers', 'creative', 'other')),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  images_json   TEXT NOT NULL DEFAULT '[]',
  image_public_ids_json TEXT NOT NULL DEFAULT '[]',
  price_cents   INTEGER NOT NULL CHECK (price_cents > 0),
  price_unit    TEXT NOT NULL DEFAULT 'per booking',
  provider_id   TEXT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_provider ON services(provider_id);

-- A buyer's one-time service purchase.
CREATE TABLE IF NOT EXISTS service_purchases (
  id                TEXT PRIMARY KEY,
  service_id        TEXT NOT NULL REFERENCES services(id),
  buyer_id          TEXT NOT NULL REFERENCES users(id),
  purchase_type     TEXT NOT NULL CHECK (purchase_type IN ('one_time', 'subscription')),
  confirmation_status TEXT NOT NULL DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'declined')),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'cancelled')),
  request_note      TEXT NOT NULL DEFAULT '',
  provider_completed INTEGER NOT NULL DEFAULT 0,
  buyer_completed    INTEGER NOT NULL DEFAULT 0,
  price_cents       INTEGER NOT NULL CHECK (price_cents > 0),
  payment_intent_id TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  used_at           TEXT,
  cancelled_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_service_purchases_buyer ON service_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_service_purchases_service ON service_purchases(service_id);

CREATE TABLE IF NOT EXISTS task_applications (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES tasks(id),
  worker_id    TEXT NOT NULL REFERENCES users(id),
  anonymous    INTEGER NOT NULL DEFAULT 0,
  request_note TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(task_id, worker_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id             TEXT PRIMARY KEY,
  recipient_id   TEXT NOT NULL REFERENCES users(id),
  type           TEXT NOT NULL,
  task_id        TEXT REFERENCES tasks(id),
  service_id     TEXT REFERENCES services(id),
  purchase_id    TEXT REFERENCES service_purchases(id),
  actor_id       TEXT REFERENCES users(id),
  message        TEXT NOT NULL,
  read_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at);

CREATE TABLE IF NOT EXISTS reviews (
  id          TEXT PRIMARY KEY,
  task_id     TEXT REFERENCES tasks(id),
  purchase_id TEXT REFERENCES service_purchases(id),
  reviewer_id TEXT NOT NULL REFERENCES users(id),
  reviewee_id TEXT NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT NOT NULL DEFAULT '',
  anonymous   INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((task_id IS NOT NULL AND purchase_id IS NULL) OR (task_id IS NULL AND purchase_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_task_reviewer ON reviews(task_id, reviewer_id) WHERE task_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_purchase_reviewer ON reviews(purchase_id, reviewer_id) WHERE purchase_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id, created_at);

CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a_id  TEXT NOT NULL REFERENCES users(id),
  user_b_id  TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_a_id, user_b_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id),
  sender_id       TEXT NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  read_at         TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- Email verification codes for registration flow
CREATE TABLE IF NOT EXISTS verification_codes (
  id              TEXT PRIMARY KEY,
  pending_user_id TEXT NOT NULL REFERENCES users(id),
  destination     TEXT NOT NULL,
  code_hash       TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  consumed_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_pending_user ON verification_codes(pending_user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- Approved school domains for registration
CREATE TABLE IF NOT EXISTS approved_domains (
  domain      TEXT PRIMARY KEY,
  school_name TEXT NOT NULL
);
