export type Platform = 'dy' | 'xhs'

export type SearchMethod = 'search' | 'detail' | 'creator'

export interface TaskConfig {
  platform: Platform
  type: SearchMethod
  id: string
  accountId?: string
  keywords: string
  filter_keywords: string
  sort_type: string
  publish_time: string
}

export interface AdvancedConfig {
  enableCommentCrawl: boolean
  enableSecondLevel: boolean
  collectCount: number
  collectAuthorInfo: boolean
  commentCount: number
  intervalSec: number
  enableCommentFilter: boolean
}
