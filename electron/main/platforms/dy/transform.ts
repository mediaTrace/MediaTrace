import {
  extractCommentImageList,
  extractContentCoverUrl,
  extractMusicDownloadUrl,
  extractNoteImageList,
  extractVideoDownloadUrl,
} from "./help";

type JsonRecord = Record<string, any>;

/**
 * 规整作品数据为落库结构（douyin_aweme）
 */
export function toAwemeRecord(awemeItem: JsonRecord, sourceKeyword: string): Record<string, unknown> {
  const awemeId = awemeItem?.aweme_id;
  const user = (awemeItem?.author ?? {}) as JsonRecord;
  const stat = (awemeItem?.statistics ?? {}) as JsonRecord;
  return {
    aweme_id: awemeId,
    aweme_type: String(awemeItem?.aweme_type ?? ""),
    title: String(awemeItem?.desc ?? ""),
    desc: String(awemeItem?.desc ?? ""),
    create_time: Number(awemeItem?.create_time ?? 0) || undefined,
    user_id: user?.uid,
    sec_uid: user?.sec_uid,
    short_user_id: user?.short_id,
    user_unique_id: user?.unique_id,
    user_signature: user?.signature,
    nickname: user?.nickname,
    avatar: user?.avatar_thumb?.url_list?.[0] ?? "",
    liked_count: String(stat?.digg_count ?? ""),
    collected_count: String(stat?.collect_count ?? ""),
    comment_count: String(stat?.comment_count ?? ""),
    share_count: String(stat?.share_count ?? ""),
    ip_location: String(awemeItem?.ip_label ?? ""),
    aweme_url: awemeId ? `https://www.douyin.com/video/${awemeId}` : "",
    cover_url: extractContentCoverUrl(awemeItem),
    video_download_url: extractVideoDownloadUrl(awemeItem),
    music_download_url: extractMusicDownloadUrl(awemeItem),
    note_download_url: extractNoteImageList(awemeItem).join(","),
    source_keyword: sourceKeyword,
    phone: String(user?.phone ?? ""),
  };
}

/**
 * 规整评论数据为落库结构（douyin_aweme_comment）
 */
export function toCommentRecord(awemeId: string, commentItem: JsonRecord): Record<string, unknown> {
  const commentAwemeId = String(commentItem?.aweme_id ?? "");
  if (commentAwemeId && commentAwemeId !== String(awemeId)) {
    return {};
  }

  const user = (commentItem?.user ?? {}) as JsonRecord;
  const avatarInfo =
    user?.avatar_medium ?? user?.avatar_300x300 ?? user?.avatar_168x168 ?? user?.avatar_thumb ?? ({} as JsonRecord);

  return {
    comment_id: commentItem?.cid,
    create_time: Number(commentItem?.create_time ?? 0) || undefined,
    ip_location: String(commentItem?.ip_label ?? ""),
    aweme_id: awemeId,
    content: commentItem?.text,
    user_id: user?.uid,
    sec_uid: user?.sec_uid,
    short_user_id: user?.short_id,
    user_unique_id: user?.unique_id,
    user_signature: user?.signature,
    nickname: user?.nickname,
    avatar: avatarInfo?.url_list?.[0] ?? "",
    sub_comment_count: String(commentItem?.reply_comment_total ?? 0),
    like_count: Number(commentItem?.digg_count ?? 0) || 0,
    parent_comment_id: String(commentItem?.reply_id ?? "0"),
    pictures: extractCommentImageList(commentItem).join(","),
    phone: String(commentItem?.phone ?? ""),
  };
}

/**
 * 规整创作者数据为落库结构（dy_creator）
 */
export function toCreatorRecord(userId: string, creator: JsonRecord): Record<string, unknown> {
  const user = (creator?.user ?? {}) as JsonRecord;
  const genderMap: Record<string, string> = { "0": "未知", "1": "男", "2": "女" };
  const avatarUri = String(user?.avatar_300x300?.uri ?? "");
  const ip = String(user?.ip_location ?? "").replace("IP属地：", "");
  return {
    user_id: userId,
    nickname: user?.nickname,
    gender: genderMap[String(user?.gender ?? "0")] ?? "未知",
    avatar: avatarUri ? `https://p3-pc.douyinpic.com/img/${avatarUri}~c5_300x300.jpeg?from=2956013662` : "",
    desc: user?.signature,
    ip_location: ip,
    follows: String(user?.following_count ?? 0),
    fans: String(user?.max_follower_count ?? 0),
    interaction: String(user?.total_favorited ?? 0),
    videos_count: String(user?.aweme_count ?? 0),
    phone: String(user?.phone ?? ""),
  };
}

