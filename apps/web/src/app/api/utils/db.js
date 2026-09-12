import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

// DATA_DIR: set via env for Render (e.g. /data), defaults to apps/web/data/
const DATA_DIR = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(process.cwd(), "data");

mkdirSync(DATA_DIR, { recursive: true });

const VIDEO_DIR = join(DATA_DIR, "videos");
mkdirSync(VIDEO_DIR, { recursive: true });

const DB_PATH = join(DATA_DIR, "guitar_tracker.db");

let _db = null;

function getDb() {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec("PRAGMA journal_mode = WAL");
    _db.exec("PRAGMA foreign_keys = ON");
    initSchema(_db);
    runMigrations(_db);
  }
  return _db;
}

function runMigrations(db) {
  // Add plain_password column to existing databases
  try {
    db.exec("ALTER TABLE students ADD COLUMN plain_password TEXT");
  } catch { /* already exists */ }
  try {
    db.exec("ALTER TABLE students ADD COLUMN level TEXT");
  } catch { /* already exists */ }
  try {
    db.exec("ALTER TABLE students ADD COLUMN is_public INTEGER DEFAULT 1");
  } catch {
    // Column already exists — ignore
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      security_question TEXT,
      security_answer   TEXT,
      plain_password TEXT,
      level TEXT,
      is_public INTEGER DEFAULT 1,
      songs TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      songs      TEXT DEFAULT '[]',
      minutes    INTEGER NOT NULL,
      notes      TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS videos (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id    INTEGER NOT NULL REFERENCES sessions(id),
      student_id    INTEGER NOT NULL REFERENCES students(id),
      filename      TEXT NOT NULL,
      original_name TEXT,
      size          INTEGER,
      uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id   INTEGER NOT NULL REFERENCES videos(id),
      text       TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export { getDb, DATA_DIR, VIDEO_DIR };
export default getDb;
