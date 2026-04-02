import type { BrowserContext, Page } from "playwright";
import type { RuntimeConfig } from "../../runtime/types";
import { createTimeoutSignal, httpBinary, httpJson } from "./net";
import { getABogus, loadDouyinSigner } from "./signature";
import { CommentFilter } from "./commentFilter";
import { extractPhonesFromText } from "./phoneExtractor";
import { logger } from "../../runtime/logger";

type JsonRecord = Record<string, any>;

/**
 * 抖音 Web API 客户端（对齐 Python DouYinClient 的核心能力）
 */
export class DouyinClient {
  private readonly config: RuntimeConfig;
  private readonly host = "https://www.douyin.com";
  private readonly timeoutMs: number;
  private readonly signer: ReturnType<typeof loadDouyinSigner>;
  private readonly page: Page;
  private cookieHeader: string;

  public constructor(params: { config: RuntimeConfig; page: Page; cookieHeader?: string; timeoutMs?: number }) {
    this.config = params.config;
    this.page = params.page;
    this.cookieHeader = params.cookieHeader ?? "";
    this.timeoutMs = params.timeoutMs ?? 60_000;
    this.signer = loadDouyinSigner(params.config);
  }

  /**
   * 判断是否已登录（优先 localStorage，其次 Cookie）
   */
  public async pong(browserContext: BrowserContext): Promise<boolean> {
    const hasUserLogin = await this.page
      .evaluate(() => {
        try {
          return (globalThis as any).localStorage?.getItem("HasUserLogin") === "1";
        } catch {
          return false;
        }
      })
      .catch(() => false);
    if (hasUserLogin) return true;

    const cookies = await browserContext.cookies().catch(() => []);
    const loginStatus = cookies.find((c) => c.name === "LOGIN_STATUS")?.value;
    if (loginStatus === "1") return true;

    const set = new Set(cookies.filter((c) => c.value).map((c) => c.name));
    for (const k of ["sessionid", "sessionid_ss", "sid_tt", "uid_tt", "passport_csrf_token", "passport_csrf_token_default"]) {
      if (set.has(k)) return true;
    }
    return false;
  }

  /**
   * 从浏览器上下文同步 Cookie 到 API 请求头
   */
  public async updateCookies(browserContext: BrowserContext): Promise<void> {
    const cookies = await browserContext.cookies();
    this.cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  /**
   * 获取当前 Cookie 字符串
   */
  public getCookieHeader(): string {
    return this.cookieHeader;
  }

  /**
   * 解析抖音短链接，返回 3xx Location
   */
  public async resolveShortUrl(shortUrl: string): Promise<string> {
    const { fetch } = await import("undici");
    const r = await fetch(shortUrl, { redirect: "manual", signal: createTimeoutSignal(10_000) });
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      return r.headers.get("location") ?? "";
    }
    return "";
  }

  /**
   * 下载媒体二进制（视频/图片/音乐）
   */
  public async getAwemeMedia(url: string): Promise<Buffer | null> {
    try {
      return await httpBinary(url, { timeoutMs: this.timeoutMs, redirect: "follow" });
    } catch {
      return null;
    }
  }

  /**
   * 搜索关键词（general）
   */
  public async searchInfoByKeyword(params: {
    keyword: string;
    offset: number;
    searchId?: string;
    pageSize: number;
    crawlIntervalMs: number;
    sortType?: string;
    publishTime?: string;
  }): Promise<JsonRecord> {
    await sleep(params.crawlIntervalMs);
    const uri = "/aweme/v1/web/general/search/single/";

    const query: Record<string, string | number> = {
      search_channel: "general",
      enable_history: "1",
      keyword: params.keyword,
      search_source: "tab_search",
      query_correct_type: "1",
      is_filter_search: "0",
      from_group_id: "7378810571505847586",
      offset: params.offset,
      count: params.pageSize,
      need_filter_settings: "1",
      list_type: "multi",
      search_id: params.searchId ?? "",
    };

    if ((params.sortType && params.sortType !== "0") || (params.publishTime && params.publishTime !== "0")) {
      query.filter_selected = JSON.stringify({ sort_type: String(params.sortType ?? "0"), publish_time: String(params.publishTime ?? "0") });
      query.is_filter_search = 1;
      query.search_source = "tab_search";
    }

    console.log('query3333333333333333333333333333', params);
    return await this.get(uri, query, {
      referer: `https://www.douyin.com/search/${encodeURIComponent(params.keyword)}?type=general`,
      skipABogus: true,
    });
  }

  /**
   * 获取视频详情
   */
  public async getVideoById(awemeId: string): Promise<JsonRecord> {
    const uri = "/aweme/v1/web/aweme/detail/";
    return await this.get(uri, { aweme_id: awemeId }, { dropOrigin: true });
  }

  /**
   * 获取评论列表
   */
  public async getAwemeComments(awemeId: string, cursor: number): Promise<JsonRecord> {
    const uri = "/aweme/v1/web/comment/list/";
    return await this.get(uri, { aweme_id: awemeId, cursor, count: 20, item_type: 0 }, { referer: this.buildSearchReferer() });
  }

  /**
   * 获取二级评论列表
   */
  public async getSubComments(awemeId: string, commentId: string, cursor: number): Promise<JsonRecord> {
    const uri = "/aweme/v1/web/comment/list/reply/";
    return await this.get(
      uri,
      { comment_id: commentId, cursor, count: 20, item_type: 0, item_id: awemeId },
      { referer: this.buildSearchReferer() },
    );
  }

  /**
   * 获取所有评论（可选二级评论；可选关键词过滤）
   */
  public async getAwemeAllComments(params: {
    awemeId: string;
    crawlIntervalMs: number;
    fetchSubComments: boolean;
    maxCount: number;
    commentFilter?: CommentFilter;
    enrichUserSignatureWhenFiltering: boolean;
  }): Promise<JsonRecord[]> {
    const result: JsonRecord[] = [];
    let hasMore = 1;
    let cursor = 0;
    let fetched = 0;

    while (hasMore && fetched < params.maxCount) {
      const res = await this.getAwemeComments(params.awemeId, cursor);
      hasMore = Number(res?.has_more ?? 0);
      cursor = Number(res?.cursor ?? 0);

      let comments = (res?.comments ?? []) as JsonRecord[];
      if (!Array.isArray(comments) || !comments.length) continue;

      if (result.length + comments.length > params.maxCount) {
        comments = comments.slice(0, params.maxCount - result.length);
      }
      fetched += comments.length;

      const enriched: JsonRecord[] = [];
      for (const c of comments) {
        const content = String(c?.text ?? "");
        if (params.commentFilter?.isEnabled()) {
          const check = params.commentFilter.check(content);
          logger.info(`评论: ${content}, isValid: ${check.isValid}`);
          if (!check.isValid) continue;
        }
        logger.info(`评论: ${content}，任务参数: ${JSON.stringify(params)}`);
        const user = (c?.user ?? {}) as JsonRecord;
        const secUid = String(user?.sec_uid ?? "");

        if (params.enrichUserSignatureWhenFiltering && params.commentFilter?.isEnabled() && secUid && !user.signature) {
          const full = await this.getUserInfo(secUid).catch(() => null);
          const sig = full?.user?.signature;
          if (sig) user.signature = sig;
        }

        const phone = this.extractPhoneNumbers(user);
        if (phone) c.phone = phone;

        enriched.push(c);
      }

      result.push(...enriched);
      await sleep(jitterMs(params.crawlIntervalMs));

      if (!params.fetchSubComments) continue;

      for (const c of comments) {
        const replyTotal = Number(c?.reply_comment_total ?? 0);
        if (!replyTotal) continue;
        const commentId = String(c?.cid ?? "");
        if (!commentId) continue;

        let subHasMore = 1;
        let subCursor = 0;
        while (subHasMore && fetched < params.maxCount) {
          const subRes = await this.getSubComments(params.awemeId, commentId, subCursor);
          subHasMore = Number(subRes?.has_more ?? 0);
          subCursor = Number(subRes?.cursor ?? 0);
          const sub = (subRes?.comments ?? []) as JsonRecord[];
          if (!Array.isArray(sub) || !sub.length) continue;
          fetched += sub.length;

          for (const sc of sub) {
            const scContent = String(sc?.text ?? "");
            if (params.commentFilter?.isEnabled()) {
              const check = params.commentFilter.check(scContent);
              logger.info(`子评论: ${scContent}, isValid: ${check.isValid}`);
              if (!check.isValid) continue;
            }
            const su = (sc?.user ?? {}) as JsonRecord;
            const secUid = String(su?.sec_uid ?? "");
            if (params.enrichUserSignatureWhenFiltering && params.commentFilter?.isEnabled() && secUid && !su.signature) {
              const full = await this.getUserInfo(secUid).catch(() => null);
              const sig = full?.user?.signature;
              if (sig) su.signature = sig;
            }

            const phone = this.extractPhoneNumbers(su);
            if (phone) sc.phone = phone;
            result.push(sc);
          }

          await sleep(jitterMs(params.crawlIntervalMs));
        }
      }
    }

    return result;
  }

  /**
   * 获取用户信息
   */
  public async getUserInfo(secUserId: string): Promise<JsonRecord> {
    const uri = "/aweme/v1/web/user/profile/other/";
    return await this.get(uri, { sec_user_id: secUserId, publish_video_strategy_type: 2, personal_center_strategy: 1 });
  }

  /**
   * 获取用户作品列表（分页）
   */
  public async getUserAwemePosts(secUserId: string, maxCursor: string, crawlIntervalMs: number): Promise<JsonRecord> {
    await sleep(crawlIntervalMs);
    const uri = "/aweme/v1/web/aweme/post/";
    return await this.get(uri, {
      sec_user_id: secUserId,
      count: 18,
      max_cursor: maxCursor,
      locate_query: "false",
      publish_video_strategy_type: 2,
      verifyFp: "verify_ma3hrt8n_q2q2HyYA_uLyO_4N6D_BLvX_E2LgoGmkA1BU",
      fp: "verify_ma3hrt8n_q2q2HyYA_uLyO_4N6D_BLvX_E2LgoGmkA1BU",
    });
  }

  private async get(uri: string, params: Record<string, string | number>, opts?: { referer?: string; dropOrigin?: boolean; skipABogus?: boolean }): Promise<JsonRecord> {
    const headers = await this.buildHeaders({ referer: opts?.referer, dropOrigin: opts?.dropOrigin });
    const processed = await this.processReqParams(uri, params, headers, "GET", opts?.skipABogus ?? false);
    const qs = buildQueryString(processed);

    const url = `${this.host}${uri}?${qs}`;
    const res = await httpJson<JsonRecord>(url, { method: "GET", headers, timeoutMs: this.timeoutMs });
    return res.data;
  }

  private async processReqParams(
    uri: string,
    params: Record<string, string | number>,
    headers: Record<string, string>,
    requestMethod: "GET" | "POST",
    skipABogus: boolean,
  ): Promise<Record<string, string | number>> {
    const localMsToken = await this.page
      .evaluate(() => {
        try {
          return (globalThis as any).localStorage?.getItem("xmst") ?? "";
        } catch {
          return "";
        }
      })
      .catch(() => "");

    const common = buildCommonParams(localMsToken);
    const merged: Record<string, string | number> = { ...params, ...common };

    if (!skipABogus && !uri.includes("/v1/web/general/search")) {
      const qs = buildQueryString(merged);
      const ab = getABogus({ urlPath: uri, queryString: qs, userAgent: headers["User-Agent"], signer: this.signer });
      merged.a_bogus = ab;
    }

    if (requestMethod === "POST") {
      // 当前 Node 版未实现 POST 场景，保留参数结构
    }

    return merged;
  }

  private async buildHeaders(opts?: { referer?: string; dropOrigin?: boolean }): Promise<Record<string, string>> {
    const ua = await this.page.evaluate(() => navigator.userAgent).catch(() => "Mozilla/5.0");
    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "User-Agent": ua,
      Cookie: this.cookieHeader,
      Referer: opts?.referer ?? "https://www.douyin.com/",
      Origin: "https://www.douyin.com",
    };
    if (opts?.dropOrigin) delete headers.Origin;
    return headers;
  }

  private buildSearchReferer(): string {
    const kw = (this.config.keywords || "").split(",")[0]?.trim() || "";
    return `https://www.douyin.com/search/${encodeURIComponent(kw)}?type=general`;
  }

  private extractPhoneNumbers(userInfo: JsonRecord): string {
    const set = new Set<string>();
    const signature = String(userInfo?.signature ?? "");
    const uniqueId = String(userInfo?.unique_id ?? "");
    const shortId = String(userInfo?.short_id ?? "");
    const nickname = String(userInfo?.nickname ?? "");
    for (const t of [signature, uniqueId, shortId, nickname]) {
      for (const p of extractPhonesFromText(t)) set.add(p);
    }
    return set.size ? [...set].sort().join(",") : "";
  }
}

function buildCommonParams(msToken: string): Record<string, string> {
  return {
    device_platform: "webapp",
    aid: "6383",
    channel: "channel_pc_web",
    version_code: "190600",
    version_name: "19.6.0",
    update_version_code: "170400",
    pc_client_type: "1",
    cookie_enabled: "true",
    browser_language: "zh-CN",
    browser_platform: "Win32",
    browser_name: "Chrome",
    browser_version: "125.0.0.0",
    browser_online: "true",
    engine_name: "Blink",
    os_name: "Windows",
    os_version: "10",
    cpu_core_num: "8",
    device_memory: "8",
    engine_version: "109.0",
    platform: "PC",
    screen_width: "2560",
    screen_height: "1440",
    effective_type: "4g",
    round_trip_time: "50",
    webid: getWebId(),
    msToken: msToken || "",
  };
}

function getWebId(): string {
  const template = "10000000-1000-4000-8000-100000000000";
  const out = template.replace(/[018]/g, (c) => {
    const n = Number(c);
    const rnd = (Math.random() * 16) | 0;
    return String((n ^ (rnd >> (n / 4))) & 0xf);
  });
  return out.replace(/-/g, "").slice(0, 19);
}

function buildQueryString(params: Record<string, string | number>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    usp.append(k, String(v));
  }
  return usp.toString();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitterMs(baseMs: number): number {
  const min = Math.max(0, baseMs - 2000);
  const max = Math.max(min, baseMs);
  return Math.floor(min + Math.random() * (max - min));
}
