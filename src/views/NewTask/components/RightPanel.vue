<template>
  <div class="flex-1 p-4 flex flex-col gap-6 overflow-y-auto relative">
    <!-- 搜索关键词 -->
    <el-form-item label="搜索关键词" prop="keywords" class="!mb-0">
      <template #label>
        <div class="w-full flex items-center gap-1.5">
          <component :is="props.taskForm.type === 'search' ? TextSearch : (props.taskForm.type === 'detail' ? TextSearch : TextSearch)" :size="14" />
          <span>{{ props.taskForm.type === 'search' ? '搜索关键词' : props.taskForm.type === 'detail' ? '视频链接 / ID' : '用户主页链接 / ID' }}</span>
        </div>
      </template>
      <div :class="['w-full group min-h-[80px] max-h-[190px] overflow-hidden rounded-xl border-2 transition-all border-[var(--el-border-color-light)]']">
        <div class="flex flex-wrap gap-2 overflow-auto p-3">
          <TagInput
            :tags="props.keywordTags"
            :taskType="props.taskForm.type"
            :button-text="`+ 新增${keywordsLabel[props.taskForm.type]}`"
            :platform="props.taskForm.platform"
            :isFilter="true"
            :placeholder="`请输入${keywordsLabel[props.taskForm.type]}`"
            :maxTags="props.taskForm.type === 'search' ? 3 : settingsStore.settings.max_notes_count || 0"
            :disableTransitions="true"
            @update:tags="emit('update:keywords', $event)"
          />
        </div>
      </div>
    </el-form-item>

    <div v-if="!simpleMode">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <el-form-item prop="sort_type" class="!mb-0" :class="['transition-all duration-300', props.taskForm.platform === 'dy' && props.taskForm.type === 'search' ? 'opacity-100 translate-y-0' : 'opacity-40 cursor-not-allowed grayscale']">
          <template #label>
            <div class="flex items-center gap-1.5">
              <ArrowUpDown :size="14" />
              <span>排序方式</span>
            </div>
          </template>
          <div class="w-full grid grid-cols-3 gap-2" :class="{'pointer-events-none': !(props.taskForm.platform === 'dy' && props.taskForm.type === 'search')}">
            <div
              v-for="item in sortType.items"
              :key="item.value"
              :class="['flex items-center justify-center px-1 rounded-lg border-2 transition-all duration-200 cursor-pointer', props.taskForm.sort_type === item.value ? 'border-[var(--el-color-primary)]' : 'border-[var(--el-border-color-light)] hover:border-[var(--el-color-primary)] hover:shadow-sm']"
              @click="emit('update:sortType', item.value)"
            >{{ item.title }}</div>
          </div>
        </el-form-item>
        <el-form-item prop="publish_time" class="!mb-0" :class="['transition-all duration-300', props.taskForm.platform === 'dy' && props.taskForm.type !== 'detail' ? 'opacity-100 translate-y-0' : 'opacity-40 cursor-not-allowed grayscale']">
          <template #label>
            <div class="flex items-center gap-1.5">
              <Calendar :size="14" />
              <span>发布时间</span>
            </div>
          </template>
          <div class="w-full grid grid-cols-4 gap-2" :class="{'pointer-events-none': !(props.taskForm.platform === 'dy' && props.taskForm.type !== 'detail')}">
            <div
              v-for="item in publishTime.items"
              :key="item.value"
              :class="['flex items-center justify-center px-1 bg-[var(--el-bg-color-overlay)] rounded-lg border-2 transition-all duration-200 cursor-pointer', props.taskForm.publish_time === item.value ? 'border-[var(--el-color-primary)]' : 'border-[var(--el-border-color-light)] hover:bg-[var(--el-fill-color-light)] hover:border-[var(--el-color-primary)] hover:shadow-sm']"
              @click="emit('update:publishTime', item.value)"
            >{{ item.title }}</div>
          </div>
        </el-form-item>
      </div>
    </div>

    <el-form-item prop="commentKeywords" class="!mb-0">
      <template #label>
        <div class="flex items-center gap-1.5">
          <Sparkles :size="14" />
          <span>评论内容过滤</span>
          <el-tooltip
            content="只提取包含以下关键字的评论，不填的话则提取所有评论"
            placement="top"
          >
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>
      <div :class="['w-full group min-h-[80px] p-3 rounded-xl border-2 transition-all border-[var(--el-border-color-light)]']">
        <div class="flex flex-wrap gap-2 mb-2">
          <TagInput
            :tags="commentFilters"
            :button-text="'新增/选择'"
            :openModalOnAdd="true"
            :disableTransitions="true"
            taskType="comment"
            placeholder="输入关键词，例如 '多少钱', '怎么买' (回车添加)"
            @open-add="emit('open-comment-keywords')"
            @update:tags="emit('update:commentFilters', $event)"
          />
        </div>
      </div>
    </el-form-item>

    <!-- 开始任务 -->
    <div class="">
      <!-- <el-button
        type="primary"
        :loading="isStarting"
        :disabled="props.processState.isRunning || props.taskForm.keywords.length === 0 || isStarting"
        :class="[
          'w-full h-auto !rounded-xl !pt-5 !pb-5',
          props.processState.isRunning ? 'shadow-none' : (props.taskForm.keywords.length === 0 ? '' : '')
        ]"
      >
        <Play :size="20" fill="currentColor" class="mr-2" />
        <span>{{ props.processState.isRunning ? '任务运行中...' : '立即开始任务' }}</span>
      </el-button> -->
      <el-button
        :class="['w-full h-auto !rounded-xl !pt-5 !pb-5']"
        type="primary"
        @click="emit('start-task')"
      >
        <Play :size="20" fill="currentColor" class="mr-2" />
        <span>立即开始</span>
      </el-button>
      <div class="text-xs text-center mt-2 opacity-60">*任务执行过程中请不要关闭任务浏览器，等待任务完成</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { Search, Video, Users, Play, Sparkles, ArrowUpDown, Calendar, TextSearch } from 'lucide-vue-next'
import type { TaskConfig } from '../types'
import TagInput from '@/components/TagInput.vue'
import { useCrawlerSettingsStore } from '@/store/crawlerSettings'
const settingsStore = useCrawlerSettingsStore()

const props = defineProps<{
  simpleMode: boolean
  taskForm: TaskConfig
  keywordTags: Array<string>
  sortType: any
  publishTime: any
  commentFilters: Array<string>
}>()

const emit = defineEmits<{
  (e: 'update:keywords', val: Array<string>): void
  (e: 'update:sortType', val: string): void
  (e: 'update:publishTime', val: string): void
  (e: 'update:commentFilters', val: Array<string>): void
  (e: 'open-comment-keywords'): void
  (e: 'start-task'): void
}>()

const keywordsLabel = {
  search: '搜索关键词',
  detail: '视频链接',
  creator: '用户主页链接'
}
const keywordsPlaceholder = {
  search: '输入关键词，例如 “创业” “外贸”（回车添加）',
  detail: '输入视频链接，例如 "https://www.douyin.com/video/7039079108619862789"（回车添加）',
  creator: '输入用户主页链接，例如 "https://www.douyin.com/user/MS4wLjABAAAAw5ZYZY5jZ_yZ5ZY5jZ_yZ5ZY5jZ_yZ5ZY5j"（回车添加）'
}
</script>
