import mysql from "mysql2/promise";
import type { RuntimeConfig } from "../../runtime/types";
import { DY_SCHEMA_SQL } from "./schema";

export type MysqlPool = mysql.Pool;

/**
 * 创建 MySQL 连接池
 */
export function createMysqlPool(config: RuntimeConfig): MysqlPool {
  return mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    connectionLimit: 5,
    charset: "utf8mb4",
  });
}

/**
 * 初始化 MySQL 表结构（dy）
 */
export async function initMysqlSchema(pool: MysqlPool): Promise<void> {
  for (const sql of DY_SCHEMA_SQL.mysql) {
    await pool.execute(sql);
  }
}

