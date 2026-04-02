import { fetch } from "undici";

export interface HttpJsonResponse<T> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

/**
 * 创建超时 AbortSignal
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);
  controller.signal.addEventListener("abort", () => clearTimeout(timer), { once: true });
  return controller.signal;
}

/**
 * 发送 JSON 请求并解析响应
 */
export async function httpJson<T>(
  url: string,
  params: {
    method: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs: number;
    redirect?: "follow" | "manual";
  },
): Promise<HttpJsonResponse<T>> {
  const res = await fetch(url, {
    method: params.method,
    headers: params.headers,
    body: params.body,
    redirect: params.redirect ?? "follow",
    signal: createTimeoutSignal(params.timeoutMs),
  });

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  const text = await res.text();
  if (!text) {
    throw new Error(`空响应: ${url}`);
  }
  if (text === "blocked") {
    throw new Error(`疑似被风控(blocked): ${url}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`JSON 解析失败: ${url}, 响应前 200 字符: ${text.slice(0, 200)}`);
  }

  return { status: res.status, headers, data: parsed as T };
}

/**
 * 发送二进制请求并返回 Buffer
 */
export async function httpBinary(
  url: string,
  params: { headers?: Record<string, string>; timeoutMs: number; redirect?: "follow" | "manual" },
): Promise<Buffer> {
  const res = await fetch(url, {
    method: "GET",
    headers: params.headers,
    redirect: params.redirect ?? "follow",
    signal: createTimeoutSignal(params.timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`二进制下载失败(${res.status}): ${url} ${text.slice(0, 200)}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

