<template>
  <div class="flex-1 bg-white shadow-sm overflow-hidden flex flex-col">
    <el-table 
      :data="data" 
      v-loading="loading" 
      style="width: 100%" 
      height="100%"
      border
      stripe
      header-cell-class-name="!bg-gray-50 !text-gray-600 !font-medium"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column type="selection" width="50" align="center" fixed="left" />
      <!-- User / Avatar / Nickname / Basic Info Column (often used for many types) -->
      <el-table-column v-if="columns.includes('nickname')" label="用户" width="220" fixed="left">
        <template #default="{ row }">
          <div class="flex items-center gap-3 leading-none">
            <div class="relative shrink-0">
              <el-avatar :size="36" :src="row.avatar" class="border border-gray-100" />
            </div>
            <div class="flex flex-col min-w-0">
              <el-button
                link
                type="primary"
                @click="openUserProfile(row)"
              >
                {{ row.nickname }}
              </el-button>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Dynamic Columns based on tableDataKey -->
      <template v-for="col in columns" :key="col">
        <!-- Skip nickname as it's already rendered as the main fixed column -->
        <template v-if="col !== 'nickname'">
          
          <!-- Content / Title / Desc Column -->
          <el-table-column 
            v-if="col === 'content' || col === 'title' || col === 'desc'" 
            :label="fieldNameMap[col] || col"         
            :min-width="tableColumnWidth[col] ? undefined : '120px'"
            :show-overflow-tooltip="{
              placement: 'left-start',
              popperStyle: {
                maxWidth: '420px'
              }
            }"
          >
            <template #default="{ row }">
              <div v-if="col === 'content'" class="text-sm text-gray-700">{{ row.content }}</div>
              <el-button
                v-else-if="col === 'title'"
                link
                type="primary"
                @click="openVideoPage(row)"
              >
                {{ row.title }}
              </el-button>
              <div v-else-if="col === 'desc'" class="text-sm text-gray-500 italic">{{ row.desc || row.user_signature || '无简介' }}</div>
            </template>
          </el-table-column>

          <el-table-column
            v-else-if="col === 'video_download_url' || col === 'music_download_url'"
            :label="fieldNameMap[col] || col"
            :width="tableColumnWidth[col] || '130px'"            
            :show-overflow-tooltip="{
              placement: 'left',
              popperStyle: {
                maxWidth: '420px'
              }
            }"
            align="center"
          >
            <template #default="{ row }">
              <div v-if="row[col]" class="w-full flex flex-col items-center gap-1">
                <el-button
                  link
                  type="primary"
                  :loading="isDownloading(row[col], col === 'video_download_url' ? 'video' : 'music')"
                  :disabled="isDownloading(row[col], col === 'video_download_url' ? 'video' : 'music')"
                  @click="downloadMedia(row[col], col === 'video_download_url' ? 'video' : 'music', row.title)"
                >
                  {{ getDownloadButtonText(row[col], col === 'video_download_url' ? 'video' : 'music') }}
                </el-button>
                <el-progress
                  v-if="isDownloading(row[col], col === 'video_download_url' ? 'video' : 'music')"
                  :percentage="getDownloadProgress(row[col], col === 'video_download_url' ? 'video' : 'music')"
                  :indeterminate="getDownloadProgress(row[col], col === 'video_download_url' ? 'video' : 'music') === 0"
                  :show-text="false"
                  :stroke-width="4"
                  class="w-full"
                />
                <div
                  v-else-if="getDownloadStatusText(row[col], col === 'video_download_url' ? 'video' : 'music')"
                  class="text-[10px]"
                  :class="isDownloadError(row[col], col === 'video_download_url' ? 'video' : 'music') ? 'text-red-500' : 'text-gray-400'"
                >
                  {{ getDownloadStatusText(row[col], col === 'video_download_url' ? 'video' : 'music') }}
                </div>
              </div>
              <span v-else class="text-xs text-gray-400">-</span>
            </template>
          </el-table-column>

          <!-- Status Columns -->
          <el-table-column 
            v-else-if="col === 'is_exported' || col === 'is_crm'" 
            :label="fieldNameMap[col] || col" 
            :width="tableColumnWidth[col] || '100px'" 
            align="center"
            :sortable="col === 'is_exported' ? 'custom' : false"
            :sort-orders="['descending', 'ascending', null]"
          >
            <template #default="{ row }">
              <div v-if="col === 'is_crm'" class="flex justify-center">
                <span 
                  class="px-2 py-1 rounded-full text-xs border flex items-center gap-1"
                  :class="row.is_crm ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'"
                >
                  <DatabaseZap :size="10" />
                  {{ row.is_crm ? '已入库' : '未入库' }}
                </span>
              </div>
              <div v-else-if="col === 'is_exported'" class="flex justify-center">
                <span 
                  class="text-xs"
                  :class="row.is_exported ? 'text-emerald-500' : 'text-gray-400'"
                >
                  {{ row.is_exported ? '已导出' : '未导出' }}
                </span>
              </div>
            </template>
          </el-table-column>

          <!-- Date Columns -->
          <el-table-column 
            v-else-if="col === 'create_time' || col === 'add_ts' || col === 'time'" 
            :prop="col"
            :label="fieldNameMap[col] || col" 
            :width="tableColumnWidth[col] || '160px'"
            :sortable="true ? 'custom' : false"
            :sort-orders="['descending', 'ascending', null]"
          >
            <template #default="{ row }">
              <div class="flex flex-col text-xs">
                <span class="text-gray-700">{{ formatDateTime(row[col])?.split(' ')[0] || '-' }}</span>
                <span class="text-gray-400">{{ formatDateTime(row[col])?.split(' ')[1] || '' }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- Default Column -->
          <el-table-column 
            v-else 
            :prop="col" 
            :label="fieldNameMap[col] || col" 
            :width="tableColumnWidth[col]"
            :show-overflow-tooltip="{
              placement: 'left',
              popperStyle: {
                maxWidth: '420px'
              }
            }"
            :sortable="col === 'phone' || col === 'last_modify_ts' ? 'custom' : false"
            :sort-orders="['descending', 'ascending', null]"
          >
            <template #default="{ row }">
              <span class="text-gray-600 text-sm">{{ row[col] ?? '-' }}</span>
            </template>
          </el-table-column>
          
        </template>
      </template>

      <!-- Actions -->
      <!-- <el-table-column label="操作" width="80" align="center" fixed="right">
        <template #default>
          <el-button link type="info">
            <MoreHorizontal :size="16" />
          </el-button>
        </template>
      </el-table-column> -->
    </el-table>
    
    <!-- Footer Pagination -->
    <div class="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
      <div class="text-xs text-gray-500">
        总计 <span class="font-bold text-gray-800">{{ total }}</span> 条记录，已选 <span class="font-bold text-[var(--el-color-primary)]">{{ selectedCount }}</span> 条
      </div>
      <el-pagination 
        background 
        layout="sizes, prev, pager, next, jumper" 
        :total="total" 
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[20, 30, 50, 100, 300, 500]"
        @update:current-page="(val: number) => $emit('update:page', val)"
        @update:page-size="(val: number) => $emit('update:page-size', val)"
        @current-change="$emit('page-change')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { DatabaseZap, MoreHorizontal } from 'lucide-vue-next'
import dayjs from 'dayjs'
import { fieldNameMap, tableColumnWidth, tableDataKey } from '../config'
import { convertLink } from '@/utils/taskType'

const props = defineProps<{
  data: any[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  dataTypeKey: string; // e.g., 'douyin_video', 'xhs_comment'
  selectedCount: number;
}>()

const emit = defineEmits<{
  (e: 'selection-change', val: any[]): void;
  (e: 'update:page', val: number): void;
  (e: 'update:page-size', val: number): void;
  (e: 'page-change'): void;
  (e: 'sort-change', val: { prop: string, order: string | null }): void;
}>()

const downloadStates = reactive<Record<string, { status: 'downloading' | 'done' | 'error'; progress: number; text: string }>>({})

const columns = computed(() => {
  return tableDataKey[props.dataTypeKey] || []
})

const handleSelectionChange = (val: any[]) => {
  emit('selection-change', val)
}

const handleSortChange = ({ prop, order }: { prop: string, order: string | null }) => {
  emit('sort-change', { prop, order })
}

const formatDateTime = (ts: number | string) => {
  if (!ts) return null
  // Some timestamps might be in seconds, some in milliseconds
  // Generally JS timestamps are 13 digits.
  let time = ts;
  if (typeof time === 'number' && time.toString().length === 10) {
    time = time * 1000
  }
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const currentPlatform = computed(() => (props.dataTypeKey.startsWith('xhs') ? 'xhs' : 'douyin'))

const openExternalLink = (url: string | null | undefined) => {
  if (!url) {
    ElMessage.warning('未找到可用链接')
    return
  }
  window.open(url, '_blank')
}

const resolveVideoUrl = (row: any) => {
  if (row.aweme_url) return convertLink(row.aweme_url, 'douyin', 'video')
  if (row.note_url) return convertLink(row.note_url, 'xhs', 'video')
  if (row.video_url) return convertLink(row.video_url, currentPlatform.value, 'video')
  if (row.aweme_id) return convertLink(String(row.aweme_id), 'douyin', 'video')
  if (row.note_id) return convertLink(String(row.note_id), 'xhs', 'video')
  return ''
}

const resolveUserUrl = (row: any) => {
  if (currentPlatform.value === 'douyin') {
    const target = row.sec_uid || row.user_unique_id || row.user_id
    if (target) return convertLink(String(target), 'douyin', 'user')
    return ''
  }
  const target = row.user_id || row.red_id
  if (target) return convertLink(String(target), 'xhs', 'user')
  return ''
}

const openUserProfile = (row: any) => {
  openExternalLink(resolveUserUrl(row))
}

const openVideoPage = (row: any) => {
  openExternalLink(resolveVideoUrl(row))
}

const getDownloadKey = (url: string, mediaType: 'video' | 'music') => `${mediaType}:${url}`

const isDownloading = (url: string, mediaType: 'video' | 'music') => {
  const state = downloadStates[getDownloadKey(url, mediaType)]
  return state?.status === 'downloading'
}

const isDownloadError = (url: string, mediaType: 'video' | 'music') => {
  const state = downloadStates[getDownloadKey(url, mediaType)]
  return state?.status === 'error'
}

const getDownloadProgress = (url: string, mediaType: 'video' | 'music') => {
  const state = downloadStates[getDownloadKey(url, mediaType)]
  return state?.progress ?? 0
}

const getDownloadStatusText = (url: string, mediaType: 'video' | 'music') => {
  const state = downloadStates[getDownloadKey(url, mediaType)]
  if (!state) return ''
  if (state.status === 'downloading') return ''
  return state.text
}

const getDownloadButtonText = (url: string, mediaType: 'video' | 'music') => {
  const state = downloadStates[getDownloadKey(url, mediaType)]
  if (state?.status === 'downloading') {
    return state.progress > 0 ? `下载中 ${state.progress}%` : '下载中...'
  }
  if (state?.status === 'done') return '重新下载'
  if (state?.status === 'error') return '重试下载'
  return mediaType === 'video' ? '下载视频' : '下载音频'
}

const downloadMedia = async (url: string, mediaType: 'video' | 'music', title?: string) => {
  const key = getDownloadKey(url, mediaType)
  if (downloadStates[key]?.status === 'downloading') return
  const downloadId = `${Date.now()}_${Math.random().toString(16).slice(2)}`
  downloadStates[key] = { status: 'downloading', progress: 0, text: '' }
  const timer = setInterval(async () => {
    try {
      const status = await window.ipcRenderer.invoke('media:download:status', { downloadId })
      if (!status) return
      if (status.status === 'downloading') {
        downloadStates[key] = { status: 'downloading', progress: status.progress || 0, text: '' }
      } else if (status.status === 'error') {
        downloadStates[key] = { status: 'error', progress: 0, text: status.error || '下载失败' }
        clearInterval(timer)
      } else if (status.status === 'done') {
        downloadStates[key] = { status: 'done', progress: 100, text: '下载完成' }
        clearInterval(timer)
      }
    } catch {}
  }, 350)
  try {
    const res = await window.ipcRenderer.invoke('media:download', { url, mediaType, downloadId, preferredName: title })
    if (res?.success) {
      downloadStates[key] = { status: 'done', progress: 100, text: '下载完成' }
      ElMessage.success(`下载完成：${res.filePath}`)
      setTimeout(() => {
        if (downloadStates[key]?.status === 'done') delete downloadStates[key]
      }, 5000)
      return
    }
    downloadStates[key] = { status: 'error', progress: 0, text: '下载失败' }
    ElMessage.error('下载失败')
  } catch (err: any) {
    downloadStates[key] = { status: 'error', progress: 0, text: err?.message || '下载失败' }
    ElMessage.error(err?.message || '下载失败')
  } finally {
    clearInterval(timer)
  }
}

const getPlatformLabel = (row: any) => {
  if (props.dataTypeKey.startsWith('xhs')) return '红'
  return '抖'
}

const getPlatformColor = (row: any) => {
  if (props.dataTypeKey.startsWith('xhs')) return 'bg-red-500'
  return 'bg-black'
}
</script>
