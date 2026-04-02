export interface Store {
  /**
   * 保存内容（作品/视频/帖子）
   */
  storeContent(item: Record<string, unknown>): Promise<"inserted" | "updated">;

  /**
   * 保存评论（含二级评论）
   */
  storeComment(item: Record<string, unknown>): Promise<"inserted" | "updated">;

  /**
   * 保存创作者信息
   */
  storeCreator(item: Record<string, unknown>): Promise<void>;

  /**
   * 获取账号Cookie
   */
  getCookie(account: string): Promise<string | null>;

  /**
   * 保存账号Cookie
   */
  saveCookie(account: string, cookies: string, userInfo?: { nickname?: string; avatar?: string; uid?: string }): Promise<void>;

  /**
   * 列出所有已保存的账号ID
   */
  listAccounts(): Promise<string[]>;

  /**
   * 删除指定账号的 Cookie
   */
  deleteAccount(account: string): Promise<void>;
}

