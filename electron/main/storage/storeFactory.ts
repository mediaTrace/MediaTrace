import type { RuntimeConfig, SaveDataOption } from "../runtime/types";
import type { Store } from "./store";
import { CsvStore } from "./stores/csvStore";
import { JsonStore } from "./stores/jsonStore";
import { MongoStore } from "./stores/mongoStore";
import { MysqlStore } from "./stores/mysqlStore";
import { SqliteStore } from "./stores/sqliteStore";

/**
 * 创建存储实现（csv/json/sqlite/db/mysql/mongodb）
 */
export function createStore(config: RuntimeConfig): Store {
  const option: SaveDataOption = config.saveDataOption;
  if (option === "csv") return new CsvStore({ platform: "douyin", crawlerType: config.crawlType });
  if (option === "json") return new JsonStore({ platform: "douyin", crawlerType: config.crawlType });
  if (option === "sqlite") return new SqliteStore(config);
  if (option === "db") return new MysqlStore(config);
  if (option === "mongodb") return new MongoStore(config);
  throw new Error(`不支持的 save_data_option: ${option}`);
}

