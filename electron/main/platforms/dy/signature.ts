import path from "node:path";
import { createRequire } from 'node:module'
import type { RuntimeConfig } from "../../runtime/types";

const require = createRequire(import.meta.url)

type SignFn = (params: string, userAgent: string) => string;

/**
 * 加载 douyin.js 签名函数（CommonJS）
 */
export function loadDouyinSigner(config: RuntimeConfig): { signDetail: SignFn; signReply: SignFn } {
  const jsPath = path.join(config.runPath, "libs", "douyin.cjs");
  const mod = require(jsPath) as { sign_datail?: SignFn; sign_reply?: SignFn };
  if (!mod.sign_datail || !mod.sign_reply) {
    throw new Error(`加载签名函数失败: ${jsPath}`);
  }
  return { signDetail: mod.sign_datail, signReply: mod.sign_reply };
}

/**
 * 计算 a_bogus 参数
 */
export function getABogus(params: { urlPath: string; queryString: string; userAgent: string; signer: ReturnType<typeof loadDouyinSigner> }): string {
  const signFn = params.urlPath.includes("/reply") ? params.signer.signReply : params.signer.signDetail;
  return signFn(params.queryString, params.userAgent);
}
