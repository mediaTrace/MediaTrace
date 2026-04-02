export type Platform = "dy";
export type LoginType = "qrcode" | "phone" | "cookie";
export type CrawlType = "search" | "detail" | "creator";
export type SaveDataOption = "csv" | "json" | "sqlite" | "db" | "mongodb";
export type InitDbOption = "sqlite" | "mysql";

export interface CliArgs {
  platform: Platform;
  loginType: LoginType;
  crawlType: CrawlType;
  startPage: number;
  keywords: string;
  saveDataOption: SaveDataOption;
  initDb?: InitDbOption;
  cookies?: string;
  account?: string;
  phone?: string;
  api: boolean;
  apiHost: string;
  apiPort: number;
  headless: boolean;
  enableCdpMode: boolean;
  autoCloseBrowser: boolean;
  enableGetComments: boolean;
  enableGetSubComments: boolean;
  enableGetUserDetails: boolean;
  enableGetMedias: boolean;
  maxNotesCount: number;
  maxCommentsCountSingleNotes: number;
  maxConcurrency: number;
  crawlerSleepSec: number;
  sqlitePath: string;
  mysqlHost: string;
  mysqlPort: number;
  mysqlUser: string;
  mysqlPassword: string;
  mysqlDatabase: string;
  mongodbUri: string;
  mongodbDb: string;
  filterKeywords: string;
  enableCommentFilter: boolean;
}

export interface RuntimeConfig extends CliArgs {
  runPath: string;
}

