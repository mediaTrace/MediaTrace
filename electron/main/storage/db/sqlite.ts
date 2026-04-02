import Database from "better-sqlite3";
import type { RuntimeConfig } from "../../runtime/types";
import { DY_SCHEMA_SQL } from "./schema";

export interface SqliteDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: any[]): Promise<{ lastID: number; changes: number }>;
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any[]>(sql: string, params?: any[]): Promise<T>;
  close(): Promise<void>;
}

/**
 * 打开 SQLite 数据库连接
 */
export async function openSqlite(config: RuntimeConfig): Promise<SqliteDb> {
  const db = new Database(config.sqlitePath);
  db.pragma("journal_mode = WAL");

  return {
    async exec(sql: string) {
      db.exec(sql);
    },
    async run(sql: string, params: any[] = []) {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);
      return { lastID: Number(info.lastInsertRowid), changes: info.changes };
    },
    async get<T = any>(sql: string, params: any[] = []) {
      const stmt = db.prepare(sql);
      return stmt.get(...params) as T | undefined;
    },
    async all<T = any[]>(sql: string, params: any[] = []) {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T;
    },
    async close() {
      db.close();
    },
  };
}

/**
 * 初始化 SQLite 表结构（dy）
 */
export async function initSqliteSchema(db: SqliteDb): Promise<void> {
  for (const sql of DY_SCHEMA_SQL.sqlite) {
    await db.exec(sql);
  }
  await ensureTaskStatsColumns(db);
  await ensureAccountColumns(db);
}

async function ensureAccountColumns(db: SqliteDb): Promise<void> {
  const rows = await db.all<any[]>("PRAGMA table_info('account_cookies')");
  const cols = new Set<string>(Array.isArray(rows) ? rows.map((r: any) => String((r as any).name)) : []);
  const adds: string[] = [];
  if (!cols.has("nickname")) adds.push("ALTER TABLE account_cookies ADD COLUMN nickname TEXT");
  if (!cols.has("avatar")) adds.push("ALTER TABLE account_cookies ADD COLUMN avatar TEXT");
  if (!cols.has("uid")) adds.push("ALTER TABLE account_cookies ADD COLUMN uid TEXT");
  for (const sql of adds) {
    await db.exec(sql);
  }
}

async function ensureTaskStatsColumns(db: SqliteDb): Promise<void> {
  const rows = await db.all<any[]>("PRAGMA table_info('task_table')");
  const cols = new Set<string>(Array.isArray(rows) ? rows.map((r: any) => String((r as any).name)) : []);
  const adds: string[] = [];
  if (!cols.has("new_videos")) adds.push("ALTER TABLE task_table ADD COLUMN new_videos INTEGER DEFAULT 0");
  if (!cols.has("updated_videos")) adds.push("ALTER TABLE task_table ADD COLUMN updated_videos INTEGER DEFAULT 0");
  if (!cols.has("new_comments")) adds.push("ALTER TABLE task_table ADD COLUMN new_comments INTEGER DEFAULT 0");
  if (!cols.has("updated_comments")) adds.push("ALTER TABLE task_table ADD COLUMN updated_comments INTEGER DEFAULT 0");
  if (!cols.has("schedule_type")) adds.push("ALTER TABLE task_table ADD COLUMN schedule_type TEXT");
  if (!cols.has("schedule_enabled")) adds.push("ALTER TABLE task_table ADD COLUMN schedule_enabled INTEGER DEFAULT 0");
  if (!cols.has("schedule_at")) adds.push("ALTER TABLE task_table ADD COLUMN schedule_at INTEGER");
  if (!cols.has("schedule_interval_ms")) adds.push("ALTER TABLE task_table ADD COLUMN schedule_interval_ms INTEGER");
  if (!cols.has("schedule_next_run")) adds.push("ALTER TABLE task_table ADD COLUMN schedule_next_run INTEGER");
  if (!cols.has("runs_count")) adds.push("ALTER TABLE task_table ADD COLUMN runs_count INTEGER DEFAULT 0");
  for (const sql of adds) {
    await db.exec(sql);
  }
}

