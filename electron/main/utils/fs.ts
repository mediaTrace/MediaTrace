import fs from "node:fs/promises";
import path from "node:path";

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * 写入二进制文件（自动建目录）
 */
export async function writeFileBinary(filePath: string, data: Uint8Array): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, data);
}

