import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface CrawlerSettings {
  start: number
  max_notes_count: number
  get_comment: boolean
  get_sub_comment: boolean
  max_comments_count: number
  max_sleep_sec: number
  comment_filter: boolean
  filter_keywords: string[]
  enable_get_user_details: boolean
}

export const useCrawlerSettingsStore = defineStore('crawlerSettings', () => {
  const STORAGE_KEY = 'crawler_settings'

  const defaultSettings: CrawlerSettings = {
    start: 1,
    max_notes_count: 15,
    get_comment: true,
    get_sub_comment: false,
    max_comments_count: 30,
    max_sleep_sec: 3,
    comment_filter: true,
    filter_keywords: ['多少钱', '多少米', '怎么卖', '合作', '价格'],
    enable_get_user_details: true
  }

  const settings = ref<CrawlerSettings>({ ...defaultSettings })

  // Initialize from localStorage
  const loadSettings = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all keys exist
        settings.value = { ...defaultSettings, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load crawler settings', e)
    }
  }

  // Watch for changes and save to localStorage
  watch(
    settings,
    (newSettings) => {
      console.log('Saving crawler settings', newSettings)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings))
    },
    { deep: true }
  )

  // Load on init
  loadSettings()

  return {
    settings,
    loadSettings
  }
})
