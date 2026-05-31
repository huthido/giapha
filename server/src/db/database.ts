import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'giapha.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);

// Migration: add `role` column to users if it predates it.
const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as { name: string }[];
if (!userColumns.some(c => c.name === 'role')) {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'`);
}

// Migration: widen UNIQUE constraint on relationships from (user_id, related_user_id)
// to (user_id, related_user_id, relation_type) so two people can share multiple roles.
const relSql = (db.prepare(
  `SELECT sql FROM sqlite_master WHERE type='table' AND name='relationships'`
).get() as { sql: string } | undefined)?.sql ?? '';
if (!relSql.includes('relation_type')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS relationships_v2 (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      related_user_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, related_user_id, relation_type)
    );
    INSERT OR IGNORE INTO relationships_v2 SELECT * FROM relationships;
    DROP TABLE relationships;
    ALTER TABLE relationships_v2 RENAME TO relationships;
    CREATE INDEX IF NOT EXISTS idx_relationships_user ON relationships(user_id);
  `);
}

// Migration: OAuth provider IDs on users
const userColsOAuth = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (!userColsOAuth.some(c => c.name === 'google_id')) {
  db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
}
if (!userColsOAuth.some(c => c.name === 'facebook_id')) {
  db.exec('ALTER TABLE users ADD COLUMN facebook_id TEXT');
}
if (!userColsOAuth.some(c => c.name === 'oauth_avatar')) {
  db.exec('ALTER TABLE users ADD COLUMN oauth_avatar TEXT');
}

// Migration: managed_by column on users (for child accounts created by parents)
const userCols2 = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (!userCols2.some(c => c.name === 'managed_by')) {
  db.exec('ALTER TABLE users ADD COLUMN managed_by TEXT');
}

// Migration: relationship_requests table
db.exec(`
  CREATE TABLE IF NOT EXISTS relationship_requests (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    relation_type TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(from_user_id, to_user_id, relation_type)
  );
  CREATE INDEX IF NOT EXISTS idx_rel_req_to ON relationship_requests(to_user_id, status);
  CREATE INDEX IF NOT EXISTS idx_rel_req_from ON relationship_requests(from_user_id, status);
`);

export default db;
