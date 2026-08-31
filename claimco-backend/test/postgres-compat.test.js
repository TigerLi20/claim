const test = require("node:test");
const assert = require("node:assert/strict");

const dbModule = require("../src/db");

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
