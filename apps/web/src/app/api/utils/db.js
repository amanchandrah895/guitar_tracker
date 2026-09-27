import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Database: Turso (hosted libSQL) in production, a local SQLite file otherwise.
//
//   TURSO_DATABASE_URL  libsql://<db>-<org>.turso.io   (set on Render)
//   TURSO_AUTH_TOKEN    database token from the Turso dashboard / CLI
//
// Without TURSO_DATABASE_URL the app keeps working exactly as before, using
// DATA_DIR/guitar_tracker.db on disk (handy for local development).
//
// IMPORTANT: nothing at module scope may touch the filesystem or network —
// `react-router build` imports this file. All I/O happens on first use.
const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : resolve(process.cwd(), "data");
const VIDEO_DIR = join(DATA_DIR, "videos");
const DB_PATH = join(DATA_DIR, "guitar_tracker.db");

// DATABASE_URL is accepted too, but only when it is a libsql:// URL.
const REMOTE_URL =
  process.env.TURSO_DATABASE_URL ||
  process.env.LIBSQL_URL ||
  (/^libsql:\/\//.test(process.env.DATABASE_URL || "") ? process.env.DATABASE_URL : "");
export const usingTurso = Boolean(REMOTE_URL);

/** Create the local data directories. Safe to call repeatedly. */
function ensureDirs() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(VIDEO_DIR, { recursive: true });
}

// libSQL rows are array-like; hand routes plain objects keyed by column name.
function toObjects(result) {
  const { columns, rows } = result;
  return rows.map((row) => {
    const o = {};
    columns.forEach((c, i) => {
      o[c] = row[i];
    });
    return o;
  });
}

const cleanArgs = (args) => args.map((a) => (a === undefined ? null : typeof a === "boolean" ? (a ? 1 : 0) : a));

/**
 * A small async version of the `db.prepare(sql).get/all/run(...)` API the
 * routes were written against, so each call site only needs an `await`.
 */
function wrap(client) {
  const exec = (sql, args) => client.execute({ sql, args: cleanArgs(args) });
  return {
    client,
    prepare(sql) {
      return {
        async get(...args) {
          return toObjects(await exec(sql, args))[0];
        },
        async all(...args) {
          return toObjects(await exec(sql, args));
        },
        async run(...args) {
          const r = await exec(sql, args);
          return {
            changes: r.rowsAffected,
            lastInsertRowid: r.lastInsertRowid == null ? undefined : Number(r.lastInsertRowid),
          };
        },
      };
    },
    async exec(sql) {
      await client.executeMultiple(sql);
    },
  };
}

let _db = null;

async function init() {
  let client;
  if (usingTurso) {
    const local = /^(libsql|https?|wss?):\/\/(localhost|127\.0\.0\.1)/.test(REMOTE_URL);
    if (!process.env.TURSO_AUTH_TOKEN && !local) {
      throw new Error("TURSO_AUTH_TOKEN is not set. Create a token in the Turso dashboard and add it to the environment.");
    }
    client = createClient({ url: REMOTE_URL, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  } else {
    ensureDirs();
    client = createClient({ url: `file:${DB_PATH}` });
    await client.execute("PRAGMA journal_mode = WAL");
  }
  const db = wrap(client);
  await initSchema(db);
  await runMigrations(db);
  return db;
}

/** Resolves to the shared database handle (schema ready). */
function getDb() {
  if (!_db) {
    _db = init().catch((err) => {
      _db = null; // let the next request retry (e.g. Turso briefly unreachable)
      throw err;
    });
  }
  return _db;
}

async function tryExec(db, sql) {
  try {
    await db.exec(sql);
  } catch {
    /* column already exists */
  }
}

async function runMigrations(db) {
  await tryExec(db, "ALTER TABLE students ADD COLUMN plain_password TEXT");
  await tryExec(db, "ALTER TABLE students ADD COLUMN level TEXT");
  await tryExec(db, "ALTER TABLE students ADD COLUMN is_public INTEGER DEFAULT 1");
  // Storage policy: older clips are soft-removed (file deleted, row kept so
  // the instructor's feedback on them survives).
  await tryExec(db, "ALTER TABLE videos ADD COLUMN removed_at DATETIME");
  // Where the clip lives: 'local' (DATA_DIR/videos) or 'cloudinary'.
  await tryExec(db, "ALTER TABLE videos ADD COLUMN storage TEXT DEFAULT 'local'");
  await tryExec(db, "ALTER TABLE videos ADD COLUMN url TEXT");
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_student ON sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_videos_student ON videos(student_id);
    CREATE INDEX IF NOT EXISTS idx_videos_session ON videos(session_id);
    CREATE INDEX IF NOT EXISTS idx_comments_video ON comments(video_id);
  `);
}

async function initSchema(db) {
  await db.exec(`
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

export { getDb, ensureDirs, DATA_DIR, VIDEO_DIR };
export default getDb;
