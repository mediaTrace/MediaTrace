import type { RuntimeConfig } from "../../runtime/types";
import { createMysqlPool, initMysqlSchema } from "./mysql";
import { initSqliteSchema, openSqlite } from "./sqlite";

/**
 * 初始化数据库（sqlite/mysql）
 */
export async function initDatabase(params: { dbType: "sqlite" | "mysql"; config: RuntimeConfig }): Promise<void> {
  if (params.dbType === "sqlite") {
    const db = await openSqlite(params.config);
    try {
      await initSqliteSchema(db);
    } finally {
      await db.close();
    }
    return;
  }

  const pool = createMysqlPool(params.config);
  try {
    await initMysqlSchema(pool);
  } finally {
    await pool.end();
  }
}

