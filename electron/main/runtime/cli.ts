import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import type { CliArgs, CrawlType, InitDbOption, LoginType, Platform, SaveDataOption } from "./types";

/**
 * 解析命令行参数（对齐 Python 版 main.py 的核心参数）
 */
export function parseArgs(argv: string[]): CliArgs {
  const parsed = yargs(argv)
    .option("platform", { type: "string", default: "dy" })
    .option("lt", { type: "string", default: "qrcode" })
    .option("type", { type: "string", default: "search" })
    .option("start", { type: "number", default: 1 })
    .option("keywords", { type: "string", default: "" })
    .option("save_data_option", { type: "string", default: "sqlite" })
    .option("init_db", { type: "string" })
    .option("cookies", { type: "string" })
    .option("account", { type: "string" })
    .option("phone", { type: "string" })
    .option("api", { type: "boolean", default: false })
    .option("api_host", { type: "string", default: process.env.API_HOST || "0.0.0.0" })
    .option("api_port", { type: "number", default: Number(process.env.API_PORT || 8080) })
    .option("headless", { type: "boolean", default: false })
    .option("cdp", { type: "boolean", default: false })
    .option("auto_close_browser", { type: "boolean", default: true })
    .option("get_comment", { type: "boolean", default: true })
    .option("get_sub_comment", { type: "boolean", default: false })
    .option("get_user_details", { type: "boolean", default: true })
    .option("get_medias", { type: "boolean", default: false })
    .option("max_notes_count", { type: "number", default: 10 })
    .option("max_comments_count", { type: "number", default: 5 })
    .option("max_concurrency", { type: "number", default: 1 })
    .option("sleep_sec", { type: "number", default: 5 })
    .option("sqlite_path", { type: "string", default: "sqlite_tables.db" })
    .option("mysql_host", { type: "string", default: process.env.MYSQL_DB_HOST || "localhost" })
    .option("mysql_port", { type: "number", default: Number(process.env.MYSQL_DB_PORT || 3306) })
    .option("mysql_user", { type: "string", default: process.env.MYSQL_DB_USER || "root" })
    .option("mysql_password", { type: "string", default: process.env.MYSQL_DB_PWD || "123456" })
    .option("mysql_database", { type: "string", default: process.env.MYSQL_DB_NAME || "media_crawler" })
    .option("mongodb_uri", { type: "string", default: process.env.MONGODB_URI || "mongodb://localhost:27017" })
    .option("mongodb_db", { type: "string", default: process.env.MONGODB_DB_NAME || "media_crawler" })
    .option("filter_keywords", { type: "string", default: "" })
    .option("enable_comment_filter", { type: "boolean", default: true })
    .parseSync();

  const pos = (parsed._ || []).map((x) => String(x));
  const platform = String(parsed.platform || pos[0] || "dy") as Platform;
  const saveDataOption = String(parsed.save_data_option || pos[1] || "sqlite") as SaveDataOption;
  const accountPos = pos[2] ? String(pos[2]) : undefined;
  const loginType = String(parsed.lt || pos[3] || "qrcode") as LoginType;
  const crawlType = String(parsed.type || pos[4] || "search") as CrawlType;
  const initDb = parsed.init_db ? (String(parsed.init_db) as InitDbOption) : undefined;
  const kwPos = pos.length > 5 ? pos.slice(5).join(" ") : pos[5] || "";

  return {
    platform,
    loginType,
    crawlType,
    startPage: Number(parsed.start || 1),
    keywords: String(parsed.keywords || kwPos || ""),
    saveDataOption,
    initDb,
    cookies: parsed.cookies ? String(parsed.cookies) : undefined,
    account: parsed.account ? String(parsed.account) : accountPos,
    phone: parsed.phone ? String(parsed.phone) : undefined,
    api: Boolean(parsed.api),
    apiHost: String(parsed.api_host || process.env.API_HOST || "0.0.0.0"),
    apiPort: Number(parsed.api_port || process.env.API_PORT || 8080),
    headless: Boolean(parsed.headless),
    enableCdpMode: Boolean(parsed.cdp),
    autoCloseBrowser: Boolean(parsed.auto_close_browser),
    enableGetComments: Boolean(parsed.get_comment),
    enableGetSubComments: Boolean(parsed.get_sub_comment),
    enableGetUserDetails: Boolean(parsed.get_user_details),
    enableGetMedias: Boolean(parsed.get_medias),
    maxNotesCount: Number(parsed.max_notes_count || 10),
    maxCommentsCountSingleNotes: Number(parsed.max_comments_count || 5),
    maxConcurrency: Number(parsed.max_concurrency || 1),
    crawlerSleepSec: Number(parsed.sleep_sec || 5),
    sqlitePath: String(parsed.sqlite_path || "sqlite_tables.db"),
    mysqlHost: String(parsed.mysql_host),
    mysqlPort: Number(parsed.mysql_port),
    mysqlUser: String(parsed.mysql_user),
    mysqlPassword: String(parsed.mysql_password),
    mysqlDatabase: String(parsed.mysql_database),
    mongodbUri: String(parsed.mongodb_uri),
    mongodbDb: String(parsed.mongodb_db),
    filterKeywords: String(parsed.filter_keywords || ""),
    enableCommentFilter: Boolean(parsed.enable_comment_filter),
  };
}

