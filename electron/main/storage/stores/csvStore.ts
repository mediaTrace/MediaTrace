import { FileWriter } from "../fileWriter";
import type { Store } from "../store";

/**
 * CSV 存储（对齐 Python: data/<platform>/csv/<type>_<item>_<date>.csv）
 */
export class CsvStore implements Store {
  private readonly writer: FileWriter;

  public constructor(params: { platform: string; crawlerType: string }) {
    this.writer = new FileWriter(params);
  }

  public async storeContent(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    await this.writer.writeCsv("contents", item);
    return "inserted";
  }

  public async storeComment(item: Record<string, unknown>): Promise<"inserted" | "updated"> {
    await this.writer.writeCsv("comments", item);
    return "inserted";
  }

  public async storeCreator(item: Record<string, unknown>): Promise<void> {
    await this.writer.writeCsv("creators", item);
  }

  public async getCookie(account: string): Promise<string | null> {
    return null;
  }

  public async saveCookie(account: string, cookies: string): Promise<void> {
    // Not supported
  }

  public async listAccounts(): Promise<string[]> {
    return [];
  }

  public async deleteAccount(account: string): Promise<void> {
    // Not supported
  }
}

