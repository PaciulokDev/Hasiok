import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export type Db = DatabaseSync;

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nickname      TEXT NOT NULL,
  birth_year    INTEGER NOT NULL,
  city          TEXT NOT NULL DEFAULT '',
  bio           TEXT NOT NULL DEFAULT '',
  gender        TEXT NOT NULL,
  looking_for   TEXT NOT NULL DEFAULT '[]',
  age_min       INTEGER NOT NULL DEFAULT 18,
  age_max       INTEGER NOT NULL DEFAULT 99,
  humor_tags    TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  caption    TEXT NOT NULL DEFAULT '',
  tags       TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS memes_owner ON memes(owner_id);

CREATE TABLE IF NOT EXISTS reactions (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meme_id    INTEGER NOT NULL REFERENCES memes(id) ON DELETE CASCADE,
  reaction   TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, meme_id)
);

CREATE TABLE IF NOT EXISTS swipes (
  from_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  liked      INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (from_id, to_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_a     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_a, user_b)
);

CREATE TABLE IF NOT EXISTS messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL DEFAULT '',
  meme_id    INTEGER REFERENCES memes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_match ON messages(match_id, id);

CREATE TABLE IF NOT EXISTS blocks (
  blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function openDb(file: string): Db {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

/** Wiersz z bazy jako zwykły obiekt (node:sqlite zwraca typ ogólny). */
export type Row = Record<string, any>;

export function one(db: Db, sql: string, ...params: any[]): Row | undefined {
  return db.prepare(sql).get(...params) as Row | undefined;
}

export function all(db: Db, sql: string, ...params: any[]): Row[] {
  return db.prepare(sql).all(...params) as Row[];
}

export function run(db: Db, sql: string, ...params: any[]) {
  const result = db.prepare(sql).run(...params);
  return { changes: Number(result.changes), id: Number(result.lastInsertRowid) };
}

export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
