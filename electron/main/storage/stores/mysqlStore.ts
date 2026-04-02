import type { RuntimeConfig } from "../../runtime/types";
import type { Store } from "../store";
import { getCurrentTimestampMs } from "../../utils/time";
import { createMysqlPool, initMysqlSchema, type MysqlPool } from "../db/mysql";

/**
 * MySQL 存储（对应 save_data_option=db）
 */
export class MysqlStore implements Store {
  private readonly config: RuntimeConfig;
  private poolPromise: Promise<MysqlPool> | undefined;

  public constructor(config: RuntimeConfig) {
    this.config = config;
  }

  public async storeContent(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    const pool = await this.getPool();
    const now = getCurrentTimestampMs();

    const normalized = normalizeDyAweme(item);
    if (!normalized.aweme_id) return "inserted";
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;

    const result = await upsert(pool, "douyin_aweme", "aweme_id", normalized);
    const affected = Number((result as any)?.affectedRows ?? 0);
    return affected >= 2 ? "updated" : "inserted";
  }

  public async storeComment(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    const pool = await this.getPool();
    const now = getCurrentTimestampMs();

    const normalized = normalizeDyComment(item);
    if (!normalized.comment_id) return "inserted";
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;

    const result = await upsert(pool, "douyin_aweme_comment", "comment_id", normalized);
    const affected = Number((result as any)?.affectedRows ?? 0);
    return affected >= 2 ? "updated" : "inserted";
  }

  public async storeCreator(item: Record<string, unknown>): Promise<void> {
    const pool = await this.getPool();
    const now = getCurrentTimestampMs();

    const normalized = normalizeDyCreator(item);
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;

    await upsert(pool, "dy_creator", "user_id", normalized);
  }

  public async getCookie(account: string): Promise<string | null> {
    const pool = await this.getPool();
    const [rows] = await pool.query<any[]>(
      "SELECT cookies FROM account_cookies WHERE account_id = ? AND platform = 'dy'",
      [account]
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return rows[0].cookies;
    }
    return null;
  }

  public async saveCookie(account: string, cookies: string): Promise<void> {
    const pool = await this.getPool();
    const now = getCurrentTimestampMs();
    const item = {
      platform: "dy",
      account_id: account,
      cookies,
      add_ts: now,
      last_modify_ts: now,
    };
    await upsert(pool, "account_cookies", "account_id", item);
  }

  public async listAccounts(): Promise<string[]> {
    const pool = await this.getPool();
    const [rows] = await pool.query<any[]>(
      "SELECT account_id FROM account_cookies WHERE platform = 'dy' ORDER BY last_modify_ts DESC"
    );
    return Array.isArray(rows) ? rows.map((r) => String(r.account_id)) : [];
  }

  public async deleteAccount(account: string): Promise<void> {
    const pool = await this.getPool();
    await pool.execute("DELETE FROM account_cookies WHERE platform = 'dy' AND account_id = ?", [account]);
  }

  private async getPool(): Promise<MysqlPool> {
    if (!this.poolPromise) {
      this.poolPromise = (async () => {
        const pool = createMysqlPool(this.config);
        await initMysqlSchema(pool);
        return pool;
      })();
    }
    return this.poolPromise;
  }
}

async function upsert(pool: MysqlPool, table: string, uniqKey: string, item: Record<string, unknown>): Promise<any> {
  const keys = Object.keys(item).filter((k) => item[k] !== undefined);
  if (!keys.length) return;

  const columns = keys.map((k) => `\`${k}\``).join(",");
  const placeholders = keys.map(() => "?").join(",");
  const updates = keys
    .filter((k) => k !== uniqKey)
    .map((k) => `\`${k}\`=VALUES(\`${k}\`)`)
    .join(",");

  const values = keys.map((k) => item[k]);
  const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
  const [result] = await pool.execute(sql, values);
  return result;
}

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

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  }
  return out;
}

