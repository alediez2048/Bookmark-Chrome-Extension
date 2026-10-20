/**
 * SQLite connection and schema, shared by the server and the sync routes.
 * Kept in its own module so routes/sync.js doesn't import index.js (a circular
 * require that left `db` undefined in every sync route).
 */

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'retweets.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS retweets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    tweet_id TEXT NOT NULL,
    user_handle TEXT,
    user_name TEXT,
    text TEXT,
    quoted_text TEXT,
    quoted_author TEXT,
    media TEXT,
    captured_at TEXT,
    original_created_at TEXT,
    tags TEXT,
    auto_tags TEXT,
    source TEXT,
    source_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, tweet_id)
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_retweets_user ON retweets(user_id);
  CREATE INDEX IF NOT EXISTS idx_retweets_captured ON retweets(captured_at);
`);

module.exports = { db };
