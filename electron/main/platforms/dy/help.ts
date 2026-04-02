import { URL } from "node:url";

export type VideoUrlType = "normal" | "modal" | "short";
export type CreatorUrlType = "normal" | "short";

export interface VideoUrlInfo {
  awemeId: string;
  urlType: VideoUrlType;
}

export interface CreatorUrlInfo {
  secUserId: string;
  urlType: CreatorUrlType;
}

/**
 * 从抖音视频 URL 或 ID 解析 aweme_id
 */
export function parseVideoInfoFromUrl(input: string): VideoUrlInfo {
  const url = input.trim();
  if (!url) throw new Error("空视频 URL");

  if (/^\d+$/.test(url)) {
    return { awemeId: url, urlType: "normal" };
  }

  if (url.includes("v.douyin.com") || (url.startsWith("http") && url.length < 50 && !url.includes("video"))) {
    return { awemeId: "", urlType: "short" };
  }

  const parsed = safeParseUrl(url);
  if (parsed) {
    const modalId = parsed.searchParams.get("modal_id");
    if (modalId && /^\d+$/.test(modalId)) {
      return { awemeId: modalId, urlType: "modal" };
    }

    const match = parsed.pathname.match(/\/video\/(\d+)/);
    if (match) {
      return { awemeId: match[1], urlType: "normal" };
    }
  }

  const fallback = url.match(/\/video\/(\d+)/);
  if (fallback) return { awemeId: fallback[1], urlType: "normal" };

  throw new Error(`无法从 URL 解析视频ID: ${input}`);
}

/**
 * 从抖音创作者主页 URL 或 ID 解析 sec_user_id
 */
export function parseCreatorInfoFromUrl(input: string): CreatorUrlInfo {
  const url = input.trim();
  if (!url) throw new Error("空创作者 URL");

  if (url.startsWith("MS4wLjABAAAA") || (!url.startsWith("http") && !url.includes("douyin.com"))) {
    return { secUserId: url, urlType: "normal" };
  }

  if (url.includes("v.douyin.com") || (url.startsWith("http") && url.length < 50 && !url.includes("user"))) {
    return { secUserId: "", urlType: "short" };
  }

  const parsed = safeParseUrl(url);
  if (parsed) {
    const match = parsed.pathname.match(/\/user\/([^/?]+)/);
    if (match) return { secUserId: match[1], urlType: "normal" };
  }

  const fallback = url.match(/\/user\/([^/?]+)/);
  if (fallback) return { secUserId: fallback[1], urlType: "normal" };

  throw new Error(`无法从 URL 解析创作者ID: ${input}`);
}

/**
 * 提取笔记图片列表（无水印）
 */
export function extractNoteImageList(awemeDetail: Record<string, any>): string[] {
  const images = (awemeDetail?.images ?? []) as Array<Record<string, any>>;
  if (!Array.isArray(images) || !images.length) return [];
  const out: string[] = [];
  for (const img of images) {
    const urls = (img?.url_list ?? []) as string[];
    if (Array.isArray(urls) && urls.length) out.push(urls[urls.length - 1]);
  }
  return out;
}

/**
 * 提取评论图片列表
 */
export function extractCommentImageList(commentItem: Record<string, any>): string[] {
  const list = (commentItem?.image_list ?? []) as Array<Record<string, any>>;
  if (!Array.isArray(list) || !list.length) return [];
  const out: string[] = [];
  for (const img of list) {
    const urls = (img?.origin_url?.url_list ?? []) as string[];
    if (Array.isArray(urls) && urls.length > 1) out.push(urls[1]);
  }
  return out;
}

/**
 * 提取视频封面地址
 */
export function extractContentCoverUrl(awemeDetail: Record<string, any>): string {
  const video = awemeDetail?.video ?? {};
  const urls = ((video?.raw_cover ?? video?.origin_cover ?? {})?.url_list ?? []) as string[];
  if (Array.isArray(urls) && urls.length > 1) return urls[1];
  return "";
}

/**
 * 提取视频下载地址
 */
export function extractVideoDownloadUrl(awemeDetail: Record<string, any>): string {
  const video = awemeDetail?.video ?? {};
  const urlH264 = (video?.play_addr_h264?.url_list ?? []) as string[];
  const url256 = (video?.play_addr_256?.url_list ?? []) as string[];
  const urlList = (video?.play_addr?.url_list ?? []) as string[];
  const actual = (urlH264.length ? urlH264 : url256.length ? url256 : urlList) as string[];
  if (!Array.isArray(actual) || actual.length < 2) return "";
  return actual[actual.length - 1];
}

/**
 * 提取音乐下载地址
 */
export function extractMusicDownloadUrl(awemeDetail: Record<string, any>): string {
  return String(awemeDetail?.music?.play_url?.uri ?? "");
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

