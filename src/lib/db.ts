import Database from 'better-sqlite3';
import path from 'path';

// Store DB in the project directory root
const dbPath = path.resolve(process.cwd(), 'vaultos.db');

export const db = new Database(dbPath, { timeout: 10000 });

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('web', 'telegram')),
      attachments TEXT, -- JSON array of metadata
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('todo', 'in-progress', 'done')),
      due_date TEXT, -- YYYY-MM-DD
      module_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_journals (
      date TEXT PRIMARY KEY, -- YYYY-MM-DD
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS file_routes (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_path TEXT NOT NULL,
      routed_path TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Projects', 'Areas', 'Resources', 'Archives')),
      module_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      payload TEXT, -- JSON payload
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL, -- emoji
      color TEXT NOT NULL, -- hex or hsl
      description TEXT NOT NULL,
      subfolders TEXT NOT NULL, -- JSON array of strings
      features TEXT NOT NULL, -- JSON array of strings
      status TEXT NOT NULL CHECK(status IN ('active', 'archived')),
      created_at TEXT NOT NULL
    );
  `);
}

// Auto-run schema initialization
try {
  initDB();
} catch (e) {
  console.warn('Database initialization warning (might be locked/active):', e);
}

// Helper to log system events
export function logSystemEvent(type: string, description: string, payload?: any) {
  const id = Math.random().toString(36).substring(2, 11);
  const createdAt = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO system_events (id, event_type, description, payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(id, type, description, payload ? JSON.stringify(payload) : null, createdAt);
}
