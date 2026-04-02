<template>
  <div class="w-[40%] bg-[var(--sidebar-bg)] p-4 flex flex-col gap-6 border-r border-[var(--border-color)] overflow-y-auto">
    <!-- 社交媒体选择 -->
    <el-form-item label="媒体平台" prop="platform" class="!mb-0">
      <template #label>
        <div class="flex items-center gap-1.5">
          <AppWindow :size="14" />
          <span>媒体平台</span>
        </div>
      </template>
      <div class="flex-1 grid grid-cols-2 gap-3">
        <div
          v-for="option in platformOptions"
          :key="option.id"
          @click="emit('update:platform', option.id)"
          :disabled="option.disabled"
          :class="[
            'flex items-center justify-center p-3 rounded-lg bg-[var(--el-bg-color-overlay)] border-2 transition-all duration-200 group w-full cursor-pointer', 
            props.taskForm.platform === option.id ? 'border-[var(--el-color-primary)] shadow-xl scale-[1.02]' : 'border-[var(--el-border-color)] hover:bg-[var(--el-fill-color-light)] hover:border-[var(--el-border-color-light)]'
          ]"
        >
          <Icon :name="option.icon" size="38px" />
          <span class="leading-none ml-2">{{ option.name }}</span>
        </div>
      </div>
    </el-form-item>

    <!-- 任务类型 -->
    <el-form-item label="任务类型" prop="type" class="!mb-0">
      <template #label>
        <div class="flex items-center gap-1.5">
          <Calendar :size="14" />
          <span>任务类型</span>
          <el-tooltip
            content="<p>关键词搜索‌：输入关键词（如‘视频教程’）精准定位相关视频，同步查看评论区内容；</p><p>单视频详情‌：查看单个视频的详细信息与评论区内容；</p><p>‌用户主页所有视频‌：浏览TA的全部作品，一键查看所有视频、评论区内容；</p>"
            placement="top"
            raw-content
          >
            <el-icon><QuestionFilled /></el-icon>
          </el-tooltip>
        </div>
      </template>
      <div class="w-full flex flex-col gap-2.5">
        <div
          v-for="option in simpleMode ? [typeOptions[0]] : typeOptions"
          :key="option.id"
          @click="emit('update:taskType', option.id)"
          :class="[
            'w-full flex items-center gap-4 p-3 rounded-xl bg-[var(--el-bg-color-overlay)] border-2 transition-all text-left group cursor-pointer',
            props.taskForm.type === option.id ? 'border-[var(--el-color-primary)] ring-4 ring-indigo-500/10 z-10 relative' : 'border-transparent hover:border-[var(--el-border-color-light)]'
          ]"
        >
          <div :class="['p-2.5 rounded-lg transition-colors', props.taskForm.type === option.id ? 'bg-[var(--el-color-primary)] text-white shadow-lg' : 'bg-[var(--el-border-color-light)] opacity-80 group-hover:text-[var(--el-color-primary)]']">
            <component :is="option.icon" :size="18" />
          </div>
          <div class="flex-1 min-w-0">
            <div :class="['text-sm mb-0.5']">{{ option.name }}</div>
            <div :class="['text-xs truncate opacity-80']">{{ option.description }}</div>
          </div>
          <div v-if="props.taskForm.type === option.id" class="w-2 h-2 rounded-full bg-[var(--el-color-primary)]"></div>
        </div>
      </div>
    </el-form-item>

    <el-form-item v-if="!simpleMode" label="账号状态" class="!mb-0">
      <template #label>
        <div class="flex items-center gap-1.5">
          <Shield :size="14" />
          <span>账号状态</span>
        </div>
      </template>
      <div class="w-full border-2 border-[var(--el-border-color-light)] rounded-xl p-3">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-medium">{{ getPlatformName(props.taskForm.platform) }}账号</div>
          <div class="text-xs font-bold" :class="accountReady ? 'text-emerald-500' : 'text-amber-500'">
            {{ accountReady ? '已登录' : '未登录' }}
          </div>
        </div>
        
        <div class="mb-3">
          <el-select 
            v-model="props.taskForm.accountId" 
            placeholder="请选择执行任务的账号" 
            class="w-full"
            clearable
          >
            <el-option
              v-for="acc in accounts"
              :key="acc.account_id"
              :label="acc.nickname || acc.account_id"
              :value="acc.account_id"
            >
              <div class="flex items-center gap-2">
                <el-avatar :size="20" :src="acc.avatar" />
                <span>{{ acc.nickname || acc.account_id }}</span>
              </div>
            </el-option>
          </el-select>
        </div>

        <div class="text-xs text-gray-500 mb-2">如果遇到运行失败或验证码，请尝试重置。</div>
        <el-button
          @click="emit('reset-login')"
          class="w-full !rounded-lg"
        >
          <LogOut :size="14" class="mr-2" />重置登录状态
        </el-button>
      </div>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AppWindow, Search, Video, Users, Calendar, LogOut, Shield } from 'lucide-vue-next'
import type { TaskConfig } from '../types'
import Icon from '@/components/icon.vue'


const props = defineProps<{
  taskForm: TaskConfig
  accounts: any[]
  simpleMode: boolean
}>()

const emit = defineEmits<{
  (e: 'update:platform', val: string): void
  (e: 'update:taskType', val: string): void
  (e: 'reset-login'): void
}>()

const accountReady = computed(() => props.accounts.length > 0)

// 社交媒体平台
const platformOptions = [
  { id: 'dy', name: '抖音', icon: 'douyin', disabled: false },
  // { id: 'xhs', name: '小红书', icon: 'xiaohongshu', disabled: false },
  // { id: 'wb', name: '微博', icon: 'weibo', disabled: true },
  // { id: 'ks', name: '快手', icon: 'kuaishou', disabled: true },
  // { id: 'bili', name: '哔哩哔哩', icon: 'blibli', disabled: true },
  // { id: 'tieba', name: '百度贴吧', icon: 'baidutieba', disabled: true },
  // { id: 'zhihu', name: '知乎', icon: 'zhihu', disabled: true }
]

// 任务类型
const typeOptions = [
  // 关键词搜索.单视频详情,用户主页
  { id: 'search', name: '关键词搜索', description: '根据关键词搜索，基于关键词的全网内容挖掘', icon: Search },
  { id: 'detail', name: '单视频详情', description: '根据视频链接搜索，指定视频链接进行深度挖掘', icon: Video },
  { id: 'creator', name: '用户主页', description: '根据用户主页链接搜索，指定博主的所有历史发布视频', icon: Users }
]

const getPlatformName = (id: string) => {
  const platform = platformOptions.find(item => item.id === id)
  return platform ? platform.name : ''
}
</script>
