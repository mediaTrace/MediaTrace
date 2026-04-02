import path from "node:path";
import type { CliArgs, RuntimeConfig } from "./types";

/**
 * 生成运行时配置（把 CLI + 默认值统一成一份配置）
 */
export function createRuntimeConfig(args: CliArgs): RuntimeConfig {
  const runPath = process.cwd();
  return {
    ...args,
    keywords: args.keywords || "",
    runPath,
    sqlitePath: path.isAbsolute(args.sqlitePath) ? args.sqlitePath : path.join(runPath, args.sqlitePath),
  };
}

export function defaultArgsFromEnv(): CliArgs {
  return {
    platform: "dy",
    loginType: "qrcode",
    crawlType: "search",
    startPage: 1,
    keywords: "",
    saveDataOption: "sqlite",
    initDb: undefined,
    cookies: undefined,
    account: undefined,
    phone: undefined,
    api: false,
    apiHost: process.env.API_HOST || "0.0.0.0",
    apiPort: Number(process.env.API_PORT || 8080),
    headless: false,
    enableCdpMode: false,
    autoCloseBrowser: true,
    enableGetComments: true,
    enableGetSubComments: false,
    enableGetUserDetails: true,
    enableGetMedias: false,
    maxNotesCount: 10,
    maxCommentsCountSingleNotes: 5,
    maxConcurrency: 1,
    crawlerSleepSec: 6,
    sqlitePath: "sqlite_tables.db",
    mysqlHost: process.env.MYSQL_DB_HOST || "localhost",
    mysqlPort: Number(process.env.MYSQL_DB_PORT || 3306),
    mysqlUser: process.env.MYSQL_DB_USER || "root",
    mysqlPassword: process.env.MYSQL_DB_PWD || "123456",
    mysqlDatabase: process.env.MYSQL_DB_NAME || "media_crawler",
    mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017",
    mongodbDb: process.env.MONGODB_DB_NAME || "media_crawler",
    filterKeywords: "",
    enableCommentFilter: true,
  };
}

