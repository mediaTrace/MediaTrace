export interface CommentFilterResult {
  isValid: boolean;
  matchedKeywords: string[];
}

export interface CommentFilterStatsSnapshot {
  total: number;
  valid: number;
  filtered: number;
  keywordMatches: Record<string, number>;
}

/**
 * 评论过滤器（关键词包含命中）
 */
export class CommentFilter {
  private readonly keywords: string[];
  private total = 0;
  private valid = 0;
  private filtered = 0;
  private readonly matches: Record<string, number> = {};

  public constructor(filterKeywords: string) {
    this.keywords = filterKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
  }

  public isEnabled(): boolean {
    return this.keywords.length > 0;
  }

  /**
   * 判断评论是否通过过滤
   */
  public check(commentContent: string): CommentFilterResult {
    this.total += 1;
    if (!commentContent) {
      this.filtered += 1;
      return { isValid: false, matchedKeywords: [] };
    }

    if (!this.keywords.length) {
      this.valid += 1;
      return { isValid: true, matchedKeywords: [] };
    }

    const matched: string[] = [];
    for (const k of this.keywords) {
      if (commentContent.includes(k)) matched.push(k);
    }

    if (matched.length) {
      this.valid += 1;
      for (const k of matched) {
        this.matches[k] = (this.matches[k] ?? 0) + 1;
      }
      return { isValid: true, matchedKeywords: matched };
    }

    this.filtered += 1;
    return { isValid: false, matchedKeywords: [] };
  }

  public snapshot(): CommentFilterStatsSnapshot {
    return {
      total: this.total,
      valid: this.valid,
      filtered: this.filtered,
      keywordMatches: { ...this.matches },
    };
  }
}

