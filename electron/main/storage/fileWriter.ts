import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "../utils/fs";
import { getCurrentDate } from "../utils/time";

/**
 * 异步文件写入器（对齐 Python AsyncFileWriter 的目录与命名规则）
 */
export class FileWriter {
  private readonly platform: string;
  private readonly crawlerType: string;
  private writeQueue: Promise<void> = Promise.resolve();

  public constructor(params: { platform: string; crawlerType: string }) {
    this.platform = params.platform;
    this.crawlerType = params.crawlerType;
  }

  /**
   * 追加写入一行 CSV
   */
  public async writeCsv(itemType: string, item: Record<string, unknown>): Promise<void> {
    const filePath = this.getFilePath("csv", itemType);
    this.writeQueue = this.writeQueue.then(async () => {
      await ensureDir(path.dirname(filePath));
      const exists = await fs
        .stat(filePath)
        .then(() => true)
        .catch(() => false);

      const headers = Object.keys(item);
      if (!exists) {
        const headerLine = `${headers.join(",")}\n`;
        await fs.writeFile(filePath, "\uFEFF" + headerLine, { encoding: "utf8" });
      }

      const line = `${headers.map((k) => csvEscape(item[k])).join(",")}\n`;
      await fs.appendFile(filePath, line, { encoding: "utf8" });
    });
    await this.writeQueue;
  }

  /**
   * 追加写入 JSON（以数组形式保存，保持与 Python 行为一致）
   */
  public async writeJson(itemType: string, item: Record<string, unknown>): Promise<void> {
    const filePath = this.getFilePath("json", itemType);
    this.writeQueue = this.writeQueue.then(async () => {
      await ensureDir(path.dirname(filePath));
      const existing = await fs
        .readFile(filePath, "utf8")
        .then((c) => c.trim())
        .catch(() => "");

      let list: unknown[] = [];
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          list = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          list = [];
        }
      }

      list.push(item);
      await fs.writeFile(filePath, JSON.stringify(list, null, 4), "utf8");
    });
    await this.writeQueue;
  }

  private getFilePath(fileType: "csv" | "json", itemType: string): string {
    const basePath = path.join("data", this.platform, fileType);
    const fileName = `${this.crawlerType}_${itemType}_${getCurrentDate()}.${fileType}`;
    return path.join(basePath, fileName);
  }
}

/**
 * CSV 字段转义
 */
function csvEscape(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  if (raw.includes('"') || raw.includes(",") || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

