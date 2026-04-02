import type { RuntimeConfig } from "../../runtime/types";
import type { Store } from "../store";
import { getCurrentTimestampMs } from "../../utils/time";
import { initSqliteSchema, openSqlite, type SqliteDb } from "../db/sqlite";

/**
 * SQLite 存储（对应 save_data_option=sqlite）
 */
export class SqliteStore implements Store {
  private readonly config: RuntimeConfig;
  private dbPromise: Promise<SqliteDb> | undefined;

  public constructor(config: RuntimeConfig) {
    this.config = config;
  }

  public async storeContent(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    const db = await this.getDb();
    const now = getCurrentTimestampMs();

    const normalized = normalizeDyAweme(item);
    if (!normalized.aweme_id) return "inserted";
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;

    const existed = await db.get<{ c: number }>(
      "SELECT 1 AS c FROM douyin_aweme WHERE aweme_id = ? LIMIT 1",
      [normalized.aweme_id]
    );
    const isUpdate = Boolean(existed?.c);

    const columns = Object.keys(normalized);
    const values = columns.map((k) => normalized[k]);
    const placeholders = columns.map(() => "?").join(",");
    const updates = columns
      .filter((c) => c !== "aweme_id")
      .map((c) => `${c}=excluded.${c}`)
      .join(",");
    console.log('555555555555555555555555555555555',columns, values);
    await db.run(
      `INSERT INTO douyin_aweme (${columns.join(",")}) VALUES (${placeholders})
       ON CONFLICT(aweme_id) DO UPDATE SET ${updates}`,
      values,
    );
    return isUpdate ? "updated" : "inserted";
  }

  public async storeComment(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    console.log('tttttttttttttttttttttttttttttttt',item);
    const db = await this.getDb();
    const now = getCurrentTimestampMs();

    const normalized = normalizeDyComment(item);
    if (!normalized.comment_id) return "inserted";
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;

    const existed = await db.get<{ c: number }>(
      "SELECT 1 AS c FROM douyin_aweme_comment WHERE comment_id = ? LIMIT 1",
      [normalized.comment_id]
    );
    const isUpdate = Boolean(existed?.c);

    const columns = Object.keys(normalized);
    const values = columns.map((k) => normalized[k]);
    const placeholders = columns.map(() => "?").join(",");
    const updates = columns
      .filter((c) => c !== "comment_id")
      .map((c) => `${c}=excluded.${c}`)
      .join(",");

    await db.run(
      `INSERT INTO douyin_aweme_comment (${columns.join(",")}) VALUES (${placeholders})
       ON CONFLICT(comment_id) DO UPDATE SET ${updates}`,
      values,
    );
    return isUpdate ? "updated" : "inserted";
  }

  public async storeCreator(item: Record<string, unknown>): Promise<void> {
    const db = await this.getDb();
    const now = getCurrentTimestampMs();

    const normalized = normalizeDyCreator(item);
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;

    const columns = Object.keys(normalized);
    const values = columns.map((k) => normalized[k]);
    const placeholders = columns.map(() => "?").join(",");
    const updates = columns
      .filter((c) => c !== "user_id")
      .map((c) => `${c}=excluded.${c}`)
      .join(",");

    await db.run(
      `INSERT INTO dy_creator (${columns.join(",")}) VALUES (${placeholders})
       ON CONFLICT(user_id) DO UPDATE SET ${updates}`,
      values,
    );
  }

  public async getCookie(account: string): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.get<{ cookies: string }>(
      "SELECT cookies FROM account_cookies WHERE account_id = ? AND platform = 'dy'",
      [account]
    );
    return row?.cookies ?? null;
  }

  public async saveCookie(account: string, cookies: string, userInfo?: { nickname?: string; avatar?: string; uid?: string }): Promise<void> {
    const db = await this.getDb();
    const now = getCurrentTimestampMs();
    
    // 构建 SQL
    let sql = `INSERT INTO account_cookies (platform, account_id, cookies, add_ts, last_modify_ts`;
    let values: any[] = ["dy", account, cookies, now, now];
    let placeholders = "?, ?, ?, ?, ?";
    let updates = "cookies=excluded.cookies, last_modify_ts=excluded.last_modify_ts";
    
    if (userInfo) {
      if (userInfo.nickname) {
        sql += ", nickname";
        placeholders += ", ?";
        values.push(userInfo.nickname);
        updates += ", nickname=excluded.nickname";
      }
      if (userInfo.avatar) {
        sql += ", avatar";
        placeholders += ", ?";
        values.push(userInfo.avatar);
        updates += ", avatar=excluded.avatar";
      }
      if (userInfo.uid) {
        sql += ", uid";
        placeholders += ", ?";
        values.push(userInfo.uid);
        updates += ", uid=excluded.uid";
      }
    }
    
    sql += `) VALUES (${placeholders}) ON CONFLICT(account_id) DO UPDATE SET ${updates}`;
    
    await db.run(sql, values);
  }

  public async listAccounts(): Promise<string[]> {
    const db = await this.getDb();
    const rows = await db.all<{ account_id: string }>(
      "SELECT account_id FROM account_cookies WHERE platform = 'dy' ORDER BY last_modify_ts DESC"
    );
    return Array.isArray(rows) ? rows.map((r) => String(r.account_id)) : [];
  }

  public async deleteAccount(account: string): Promise<void> {
    const db = await this.getDb();
    await db.run("DELETE FROM account_cookies WHERE platform = 'dy' AND account_id = ?", [account]);
  }

  private async getDb(): Promise<SqliteDb> {
    if (!this.dbPromise) {
      this.dbPromise = (async () => {
        const db = await openSqlite(this.config);
        await initSqliteSchema(db);
        return db;
      })();
    }
    return this.dbPromise;
  }
}

/**
 * 规整 dy 作品字段（只保留表字段）
 */
function normalizeDyAweme(item: Record<string, unknown>): Record<string, unknown> {
  return pick(item, [
    "user_id",
    "sec_uid",
    "short_user_id",
    "user_unique_id",
    "nickname",
    "avatar",
    "user_signature",
    "ip_location",
    "add_ts",
    "last_modify_ts",
    "aweme_id",
    "aweme_type",
    "title",
    "desc",
    "create_time",
    "liked_count",
    "comment_count",
    "share_count",
    "collected_count",
    "aweme_url",
    "cover_url",
    "video_download_url",
    "music_download_url",
    "note_download_url",
    "source_keyword",
    "is_exported",
    "phone",
  ]);
}

/**
 * 规整 dy 评论字段（只保留表字段）
 */
function normalizeDyComment(item: Record<string, unknown>): Record<string, unknown> {
  return pick(item, [
    "user_id",
    "sec_uid",
    "short_user_id",
    "user_unique_id",
    "nickname",
    "avatar",
    "user_signature",
    "ip_location",
    "add_ts",
    "last_modify_ts",
    "comment_id",
    "aweme_id",
    "content",
    "create_time",
    "sub_comment_count",
    "parent_comment_id",
    "like_count",
    "pictures",
    "phone",
    "is_exported",
    "is_crm",
  ]);
}

/**
 * 规整 dy 创作者字段（只保留表字段）
 */
function normalizeDyCreator(item: Record<string, unknown>): Record<string, unknown> {
  return pick(item, [
    "user_id",
    "nickname",
    "avatar",
    "ip_location",
    "add_ts",
    "last_modify_ts",
    "desc",
    "gender",
    "follows",
    "fans",
    "interaction",
    "videos_count",
    "phone",
    "is_exported",
  ]);
}

/**
 * 选择字段子集
 */
function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  }
  return out;
}

