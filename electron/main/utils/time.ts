/**
 * 获取当前日期字符串（YYYY-MM-DD）
 */
export function getCurrentDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 获取当前毫秒时间戳
 */
export function getCurrentTimestampMs(): number {
  return Date.now();
}

