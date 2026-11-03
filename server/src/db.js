/**
 * 数据库：node:sqlite（Node 22 内置），单文件，零依赖。
 * 表结构按 docs/ACTION-METRICS.md 的实体划分，企业维度贯穿所有业务表。
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 用模块相对路径而不是 process.cwd()，避免部署环境工作目录不同导致找不到库文件
const HERE = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.HX_DB || resolve(HERE, '../data/hongxin.db');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS enterprises (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id            TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
  title         TEXT NOT NULL,
  total_days    INTEGER NOT NULL DEFAULT 21,
  start_date    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('employee','admin')),
  course_id     TEXT REFERENCES courses(id),
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id            TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(id),
  course_id     TEXT NOT NULL REFERENCES courses(id),
  name          TEXT NOT NULL,
  slogan        TEXT NOT NULL DEFAULT '',
  city          TEXT NOT NULL DEFAULT '',
  captain_id    TEXT NOT NULL REFERENCES users(id),
  invite_code   TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  UNIQUE(enterprise_id, course_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id   TEXT NOT NULL REFERENCES teams(id),
  user_id   TEXT NOT NULL REFERENCES users(id),
  joined_at TEXT NOT NULL,
  left_at   TEXT,
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS tasks (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id),
  kind       TEXT NOT NULL CHECK (kind IN ('early','run','read','visit')),
  title      TEXT NOT NULL,
  rule_json  TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS action_records (
  id                TEXT PRIMARY KEY,
  enterprise_id     TEXT NOT NULL REFERENCES enterprises(id),
  user_id           TEXT NOT NULL REFERENCES users(id),
  course_id         TEXT NOT NULL REFERENCES courses(id),
  task_id           TEXT NOT NULL REFERENCES tasks(id),
  kind              TEXT NOT NULL CHECK (kind IN ('early','run','read','visit')),
  biz_date          TEXT NOT NULL,
  team_id           TEXT,
  client_claimed_at TEXT NOT NULL,
  server_received_at TEXT NOT NULL,
  received_delay_ms INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL CHECK (status IN ('valid','pending_review','rejected')),
  review_reason     TEXT,
  metrics_json      TEXT NOT NULL DEFAULT '{}',
  payload_json      TEXT NOT NULL DEFAULT '{}',
  idempotency_key   TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_records_ent_date ON action_records(enterprise_id, biz_date, kind, status);
CREATE INDEX IF NOT EXISTS idx_records_user_date ON action_records(user_id, biz_date);
CREATE INDEX IF NOT EXISTS idx_records_biz ON action_records(biz_date, kind);

CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  record_id  TEXT NOT NULL REFERENCES action_records(id),
  reviewer_id TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('approve','reject')),
  reason     TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS export_logs (
  id            TEXT PRIMARY KEY,
  enterprise_id TEXT NOT NULL,
  actor_id      TEXT NOT NULL,
  filters_json  TEXT NOT NULL,
  row_count     INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);
`;

let _db = null;

export function getDb() {
  if (_db) return _db;
  if (DB_PATH !== ':memory:') mkdirSync(dirname(DB_PATH), { recursive: true });
  _db = new DatabaseSync(DB_PATH);
  _db.exec(SCHEMA);
  return _db;
}

export function dbPath() {
  return DB_PATH;
}

export function resetDb() {
  const db = getDb();
  const tables = ['reviews', 'export_logs', 'action_records', 'team_members', 'teams', 'tasks', 'users', 'courses', 'enterprises'];
  db.exec('PRAGMA foreign_keys = OFF');
  for (const t of tables) db.exec(`DELETE FROM ${t}`);
  db.exec('PRAGMA foreign_keys = ON');
}

export function closeDb() {
  if (_db) { _db.close(); _db = null; }
}
