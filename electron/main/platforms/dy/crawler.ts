import path from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright";
import type { RuntimeConfig } from "../../runtime/types";
import { logger } from "../../runtime/logger";
import { writeFileBinary } from "../../utils/fs";
import { createStore } from "../../storage/storeFactory";
import { TasksRepo } from "../../storage/tasksRepo";
import { DouyinClient } from "./client";
import { CommentFilter } from "./commentFilter";
import { parseCreatorInfoFromUrl, parseVideoInfoFromUrl, extractNoteImageList, extractVideoDownloadUrl } from "./help";
import { extractPhonesFromText } from "./phoneExtractor";
import { toAwemeRecord, toCommentRecord, toCreatorRecord } from "./transform";
import { DouyinLogin } from "./login";

type JsonRecord = Record<string, any>;

export interface CrawlerSession {
  browser: Browser;
  context: BrowserContext;
}

export interface ILogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * 抖音爬虫（Node/Playwright 版）
 */
export class DouyinCrawler {
  private readonly config: RuntimeConfig;
  private logger: ILogger;
  private cancelSignal: AbortSignal | undefined;
  private taskId: string | undefined;
  private stats = { new_videos: 0, updated_videos: 0, new_comments: 0, updated_comments: 0 };

  public constructor(config: RuntimeConfig) {
    this.config = config;
    this.logger = logger; // Default to global logger
  }

  /**
   * 启动浏览器并执行 dy 采集流程
   */
  public async start(options?: { onSession?: (s: CrawlerSession) => Promise<void> | void; cancelSignal?: AbortSignal; taskId?: string; logger?: ILogger }): Promise<CrawlerSession> {
    if (this.config.enableCdpMode) {
      throw new Error("当前 Node 版暂未实现 CDP 模式");
    }

    if (options?.logger) {
      this.logger = options.logger;
    }
    this.cancelSignal = options?.cancelSignal;
    this.taskId = options?.taskId;
    const browser = await chromium.launch({ headless: this.config.headless });
    const context = await browser.newContext();
    const repo = new TasksRepo(this.config);
    try {
      const stealthPath = path.join(this.config.runPath, "libs", "stealth.min.js");
      await context.addInitScript({ path: stealthPath }).catch(() => undefined);

      const store = createStore(this.config);

      const page = await context.newPage();
      await page.goto("https://www.douyin.com", { waitUntil: "domcontentloaded" });

      if (this.cancelSignal?.aborted) {
        throw new Error("closed_by_user");
      }
      if (options?.onSession) {
        await Promise.resolve(options.onSession({ browser, context }));
      }

      const client = new DouyinClient({ config: this.config, page, cookieHeader: "" });
      await client.updateCookies(context);

      // 只有在非 search 模式或者 loginType 不为 qrcode 时，才检查登录
      // 或者如果用户显式要求检查登录
      // 这里逻辑需要仔细调整：
      // 如果是 search 模式，且没有 cookies，我们其实可以不登录直接搜？
      // 但现在策略是统一要求登录状态
      await this.waitForLoginIfNeeded(client, context, page, store);
      await client.updateCookies(context);

      if (this.config.account) {
        const cookies = await context.cookies().catch(() => []);
        await store.saveCookie(this.config.account, JSON.stringify(cookies));
        this.logger.info(`已保存账号 [${this.config.account}] 的 Cookie`);
      }

      if (this.config.crawlType === "search") {
        await this.runSearch(client, store);
      } else if (this.config.crawlType === "detail") {
        await this.runDetail(client, store);
      } else if (this.config.crawlType === "creator") {
        await this.runCreator(client, store);
      } else {
        throw new Error(`不支持的 crawlType: ${this.config.crawlType}`);
      }

      this.logger.info("抖音采集任务执行完毕");
      // 任务完成后，如果不开启自动关闭浏览器，则保持开启
      if (this.config.autoCloseBrowser) {
        await context.close().catch(() => undefined);
        await browser.close().catch(() => undefined);
      }
      return { browser, context };
    } catch (err) {
      await context.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
      throw err;
    } finally {
      if (this.taskId) {
        await repo.updateTask(this.taskId, {
          new_videos: this.stats.new_videos,
          updated_videos: this.stats.updated_videos,
          new_comments: this.stats.new_comments,
          updated_comments: this.stats.updated_comments,
        } as any);
      }
    }
  }

  private async waitForLoginIfNeeded(
    client: DouyinClient,
    context: BrowserContext,
    page: Page,
    store: ReturnType<typeof createStore>,
  ): Promise<void> {
    const ok = await client.pong(context);
    if (ok) {
      this.logger.info('登录状态检查通过')
      return;
    }
    this.logger.info(`登录状态失效，准备执行登录流程 (LoginType: ${this.config.loginType})`)
    if (this.config.loginType === "cookie" && !this.config.cookies && this.config.account) {
      this.logger.info(`未找到账号 [${this.config.account}] 的 Cookie，尝试使用兜底 Cookie`);
      const saved = await store.getCookie(this.config.account);
      if (saved) {
        this.config.cookies = saved;
        this.logger.info(`兜底加载账号 [${this.config.account}] 的 Cookie`);
      }
    }
    if (this.config.loginType === "cookie" && !this.config.cookies) {
      throw new Error("cookie 登录需要 --account 或 --cookies（或先通过二维码登录保存后再使用该账号）");
    }
    const login = new DouyinLogin({
      loginType: this.config.loginType,
      browserContext: context,
      contextPage: page,
      loginPhone: this.config.phone,
      cookieStr: this.config.cookies,
    });
    await page.bringToFront().catch(() => undefined);
    await login.begin();
  }

  private async runSearch(client: DouyinClient, store: ReturnType<typeof createStore>): Promise<void> {
    const keywords = (this.config.keywords || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!keywords.length) throw new Error("search 模式需要 --keywords");

    for (const keyword of keywords) {
      if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
      this.logger.info(`开始搜索关键词: ${keyword}`);
      const processedAuthors = new Set<string>();
      const awemeIds: string[] = [];

      let cursor = Math.max(0, (this.config.startPage - 1) * 10);
      let page = this.config.startPage;
      let searchId = "";
      let fetched = 0;

      while (fetched < this.config.maxNotesCount) {
        if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
        this.logger.info(`开始抓取第 ${page} 页`);
        const res = await client.searchInfoByKeyword({
          keyword,
          offset: cursor,
          searchId,
          pageSize: 10,
          crawlIntervalMs: Math.max(0, this.config.crawlerSleepSec * 1000),
        });
        this.logger.info(`已抓取 ${page} 页，共 ${res?.data.length} 条数据`);
        const data = (res?.data ?? []) as JsonRecord[];
        if (!Array.isArray(data) || !data.length) break;

        searchId = String(res?.extra?.logid ?? "");
        cursor = Number(res?.cursor ?? 0);
        const hasMore = Number(res?.has_more ?? 0);

        for (const postItem of data) {
          if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
          const awemeInfo: JsonRecord | undefined =
            (postItem?.aweme_info as JsonRecord | undefined) ?? (postItem?.aweme_mix_info?.mix_items?.[0] as JsonRecord | undefined);
          if (!awemeInfo?.aweme_id) continue;

          const author = (awemeInfo.author ?? {}) as JsonRecord;
          const secUid = String(author?.sec_uid ?? "");
          let userPhone = "";

          if (this.config.enableGetUserDetails && secUid && !processedAuthors.has(secUid)) {
            const detail = await client.getUserInfo(secUid).catch(() => null);
            const phone = detail?.user ? extractUserPhone(detail.user) : "";
            if (detail?.user) detail.user.phone = phone;
            userPhone = phone;
            if (detail) {
              await store.storeCreator(toCreatorRecord(secUid, detail));
              processedAuthors.add(secUid);
            }
          }

          if (!author.phone) author.phone = userPhone;
          const action = await store.storeContent(toAwemeRecord(awemeInfo, keyword));
          if (action === "inserted") this.stats.new_videos += 1;
          else this.stats.updated_videos += 1;

          if (this.config.enableGetMedias) {
            await this.downloadAwemeMedias(client, awemeInfo);
          }

          awemeIds.push(String(awemeInfo.aweme_id));
          fetched += 1;
          if (fetched >= this.config.maxNotesCount) break;
        }

        page += 1;
        if (!hasMore) break;
      }
      this.logger.info(`已获取 ${fetched} 条结果`);
      if (this.config.enableGetComments && awemeIds.length) {
        this.logger.info(`开始获取 ${awemeIds.length} 条视频的评论`);
        await this.fetchAndStoreComments(client, store, awemeIds);
      }
    }
  }

  private async runDetail(client: DouyinClient, store: ReturnType<typeof createStore>): Promise<void> {
    const targets = (this.config.keywords || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!targets.length) throw new Error("detail 模式使用 --keywords 传入视频URL或aweme_id（逗号分隔）");

    const awemeIds: string[] = [];
    for (const t of targets) {
      if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
      let info = parseVideoInfoFromUrl(t);
      if (info.urlType === "short") {
        const resolved = await client.resolveShortUrl(t);
        if (!resolved) continue;
        info = parseVideoInfoFromUrl(resolved);
      }
      if (!info.awemeId) continue;
      awemeIds.push(info.awemeId);
    }

    for (const awemeId of awemeIds) {
      if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
      const res = await client.getVideoById(awemeId);
      const detail = (res?.aweme_detail ?? {}) as JsonRecord;
      if (!detail?.aweme_id) continue;
      const action = await store.storeContent(toAwemeRecord(detail, ""));
      if (action === "inserted") this.stats.new_videos += 1;
      else this.stats.updated_videos += 1;
      if (this.config.enableGetMedias) await this.downloadAwemeMedias(client, detail);
    }

    if (this.config.enableGetComments && awemeIds.length) {
      if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
      await this.fetchAndStoreComments(client, store, awemeIds);
    }
  }

  private async runCreator(client: DouyinClient, store: ReturnType<typeof createStore>): Promise<void> {
    const targets = (this.config.keywords || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!targets.length) throw new Error("creator 模式使用 --keywords 传入创作者URL或sec_user_id（逗号分隔）");

    for (const t of targets) {
      if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
      let info = parseCreatorInfoFromUrl(t);
      if (info.urlType === "short") {
        const resolved = await client.resolveShortUrl(t);
        if (!resolved) continue;
        info = parseCreatorInfoFromUrl(resolved);
      }
      if (!info.secUserId) continue;

      const creator = await client.getUserInfo(info.secUserId).catch(() => null);
      if (creator?.user) {
        const phone = extractUserPhone(creator.user);
        creator.user.phone = phone;
      }
      if (creator) await store.storeCreator(toCreatorRecord(info.secUserId, creator));

      const awemeIds: string[] = [];
      let hasMore = 1;
      let maxCursor = "0";
      while (hasMore && awemeIds.length < this.config.maxNotesCount) {
        if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
        const posts = await client.getUserAwemePosts(info.secUserId, maxCursor, Math.max(0, this.config.crawlerSleepSec * 1000));
        hasMore = Number(posts?.has_more ?? 0);
        maxCursor = String(posts?.max_cursor ?? "0");
        const list = (posts?.aweme_list ?? []) as JsonRecord[];
        if (!Array.isArray(list) || !list.length) break;

        for (const aweme of list) {
          if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
          if (!aweme?.aweme_id) continue;
          const action = await store.storeContent(toAwemeRecord(aweme, ""));
          if (action === "inserted") this.stats.new_videos += 1;
          else this.stats.updated_videos += 1;
          if (this.config.enableGetMedias) await this.downloadAwemeMedias(client, aweme);
          awemeIds.push(String(aweme.aweme_id));
          if (awemeIds.length >= this.config.maxNotesCount) break;
        }
      }

      if (this.config.enableGetComments && awemeIds.length) {
        if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
        await this.fetchAndStoreComments(client, store, awemeIds);
      }
    }
  }

  private async fetchAndStoreComments(client: DouyinClient, store: ReturnType<typeof createStore>, awemeIds: string[]): Promise<void> {
    const enableFilter = this.config.enableCommentFilter && Boolean(this.config.filterKeywords?.trim());
    const filter = enableFilter ? new CommentFilter(this.config.filterKeywords) : undefined;

    for (const awemeId of awemeIds) {
      if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
      this.logger.info(`开始抓取笔记${awemeId}的评论...,${this.config.maxCommentsCountSingleNotes}`);
      const comments = await client.getAwemeAllComments({
        awemeId,
        crawlIntervalMs: Math.max(0, this.config.crawlerSleepSec * 1000),
        fetchSubComments: this.config.enableGetSubComments,
        maxCount: this.config.maxCommentsCountSingleNotes,
        commentFilter: filter,
        enrichUserSignatureWhenFiltering: enableFilter,
      });
      this.logger.info(`获取到笔记${awemeId}的评论`);
      for (const c of comments) {
        if (this.cancelSignal?.aborted) throw new Error("closed_by_user");
        const item = toCommentRecord(awemeId, c);
        if (Object.keys(item).length) {
          const action = await store.storeComment(item);
          this.logger.info(`存储笔记${awemeId}的评论: ${item.content || '无内容'}`);
          if (action === "inserted") this.stats.new_comments += 1;
          else this.stats.updated_comments += 1;
        }
      }
    }

    if (filter?.isEnabled()) {
      const snap = filter.snapshot();
      this.logger.info(`评论过滤统计: 总数=${snap.total} 有效=${snap.valid} 过滤=${snap.filtered}`);
    }
  }

  private async downloadAwemeMedias(client: DouyinClient, awemeItem: JsonRecord): Promise<void> {
    const awemeId = String(awemeItem?.aweme_id ?? "");
    if (!awemeId) return;

    const imageUrls = extractNoteImageList(awemeItem);
    if (imageUrls.length) {
      let idx = 0;
      for (const url of imageUrls) {
        idx += 1;
        const bin = await client.getAwemeMedia(url);
        if (!bin) continue;
        const name = guessFileName(url, `image_${idx}.jpg`);
        const savePath = path.join(this.config.runPath, "data", "douyin", "images", awemeId, name);
        await writeFileBinary(savePath, bin);
      }
    }

    const videoUrl = extractVideoDownloadUrl(awemeItem);
    if (videoUrl) {
      const bin = await client.getAwemeMedia(videoUrl);
      if (bin) {
        const name = guessFileName(videoUrl, "video.mp4");
        const savePath = path.join(this.config.runPath, "data", "douyin", "videos", awemeId, name);
        await writeFileBinary(savePath, bin);
      }
    }
  }
}

function extractUserPhone(userInfo: JsonRecord): string {
  const set = new Set<string>();
  for (const t of [userInfo?.signature, userInfo?.unique_id, userInfo?.short_id, userInfo?.nickname]) {
    const s = String(t ?? "");
    for (const p of extractPhonesFromText(s)) set.add(p);
  }
  return set.size ? [...set].sort().join(",") : "";
}

function guessFileName(url: string, fallback: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const clean = seg.split("?")[0].trim();
    return clean || fallback;
  } catch {
    const parts = url.split("/").filter(Boolean);
    const last = parts[parts.length - 1] ?? "";
    const clean = last.split("?")[0].trim();
    return clean || fallback;
  }
}

async function trySetCookiesToContext(context: BrowserContext, cookieStr: string): Promise<void> {
  const list = parseCookieString(cookieStr);
  if (!list.length) return;
  const cookies = list.map((c) => ({
    name: c.name,
    value: c.value,
    url: "https://www.douyin.com",
  }));
  await context.addCookies(cookies).catch(() => undefined);
}

async function trySetStoredCookiesToContext(context: BrowserContext, stored: string): Promise<void> {
  const s = String(stored || "").trim();
  if (!s) return;

  if (s.startsWith("[")) {
    const parsed = safeParseJsonArray(s);
    if (parsed.length) {
      const cookies = parsed
        .map((c) => normalizeCookieForPlaywright(c))
        .filter((c) => Boolean(c?.name) && Boolean(c?.value));
      if (cookies.length) {
        await context.addCookies(cookies as any).catch(() => undefined);
        return;
      }
    }
  }

  await trySetCookiesToContext(context, s);
}

function safeParseJsonArray(text: string): any[] {
  try {
    const v = JSON.parse(text);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function normalizeCookieForPlaywright(raw: any): any {
  const cookie: any = {
    name: String(raw?.name ?? ""),
    value: String(raw?.value ?? ""),
    domain: raw?.domain ? String(raw.domain) : ".douyin.com",
    path: raw?.path ? String(raw.path) : "/",
  };
  if (raw?.expires !== undefined) cookie.expires = Number(raw.expires);
  if (raw?.httpOnly !== undefined) cookie.httpOnly = Boolean(raw.httpOnly);
  if (raw?.secure !== undefined) cookie.secure = Boolean(raw.secure);
  if (raw?.sameSite !== undefined) cookie.sameSite = raw.sameSite;
  return cookie;
}

function parseCookieString(cookieStr: string): Array<{ name: string; value: string }> {
  return cookieStr
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((kv) => {
      const idx = kv.indexOf("=");
      if (idx < 0) return null;
      return { name: kv.slice(0, idx).trim(), value: kv.slice(idx + 1).trim() };
    })
    .filter((x): x is { name: string; value: string } => Boolean(x?.name));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

