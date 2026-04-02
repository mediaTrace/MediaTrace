import { MongoClient } from "mongodb";
import type { RuntimeConfig } from "../../runtime/types";
import type { Store } from "../store";
import { getCurrentTimestampMs } from "../../utils/time";

/**
 * MongoDB 存储（对应 save_data_option=mongodb）
 */
export class MongoStore implements Store {
  private readonly config: RuntimeConfig;
  private clientPromise: Promise<MongoClient> | undefined;

  public constructor(config: RuntimeConfig) {
    this.config = config;
  }

  public async storeContent(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    const now = getCurrentTimestampMs();
    const normalized = normalizeDyAweme(item);
    if (!normalized.aweme_id) return "inserted";
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;
    const awemeId = normalized.aweme_id;
    if (!awemeId) return "inserted";
    const coll = await this.getCollection("contents");
    const r = await coll.updateOne({ aweme_id: awemeId }, { $set: normalized }, { upsert: true });
    return r.upsertedId ? "inserted" : "updated";
  }

  public async storeComment(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    const now = getCurrentTimestampMs();
    const normalized = normalizeDyComment(item);
    if (!normalized.comment_id) return "inserted";
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;
    const commentId = normalized.comment_id;
    if (!commentId) return "inserted";
    const coll = await this.getCollection("comments");
    const r = await coll.updateOne({ comment_id: commentId }, { $set: normalized }, { upsert: true });
    return r.upsertedId ? "inserted" : "updated";
  }

  public async storeCreator(item: Record<string, unknown>): Promise<void> {
    const now = getCurrentTimestampMs();
    const normalized = normalizeDyCreator(item);
    normalized.add_ts ??= now;
    normalized.last_modify_ts ??= now;
    const userId = normalized.user_id;
    if (!userId) return;
    const coll = await this.getCollection("creators");
    await coll.updateOne({ user_id: userId }, { $set: normalized }, { upsert: true });
  }

  public async getCookie(account: string): Promise<string | null> {
    const client = await this.getClient();
    const db = client.db(this.config.mongodbDb);
    const coll = db.collection("account_cookies");
    const doc = await coll.findOne({ account_id: account, platform: "dy" });
    return doc?.cookies || null;
  }

  public async saveCookie(account: string, cookies: string): Promise<void> {
    const now = getCurrentTimestampMs();
    const client = await this.getClient();
    const db = client.db(this.config.mongodbDb);
    const coll = db.collection("account_cookies");
    await coll.updateOne(
      { account_id: account, platform: "dy" },
      { $set: { cookies, last_modify_ts: now }, $setOnInsert: { add_ts: now } },
      { upsert: true }
    );
  }

  public async listAccounts(): Promise<string[]> {
    const client = await this.getClient();
    const db = client.db(this.config.mongodbDb);
    const coll = db.collection("account_cookies");
    const docs = await coll.find({ platform: "dy" }).project({ account_id: 1, _id: 0 }).sort({ last_modify_ts: -1 }).toArray();
    return docs.map((d: any) => String(d.account_id));
  }

  public async deleteAccount(account: string): Promise<void> {
    const client = await this.getClient();
    const db = client.db(this.config.mongodbDb);
    const coll = db.collection("account_cookies");
    await coll.deleteOne({ account_id: account, platform: "dy" });
  }

  private async getCollection(suffix: "contents" | "comments" | "creators") {
    const client = await this.getClient();
    const db = client.db(this.config.mongodbDb);
    return db.collection(`douyin_${suffix}`);
  }

  private async getClient(): Promise<MongoClient> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const client = new MongoClient(this.config.mongodbUri);
        await client.connect();
        return client;
      })();
    }
    return this.clientPromise;
  }
}

function normalizeDyAweme(item: Record<string, unknown>): Record<string, any> {
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

function normalizeDyComment(item: Record<string, unknown>): Record<string, any> {
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

function normalizeDyCreator(item: Record<string, unknown>): Record<string, any> {
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

function pick(obj: Record<string, unknown>, keys: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = obj[k];
    }
  }
  return out;
}

