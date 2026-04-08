<template>
  <div class="flex flex-col w-full h-full gap-1">
    <div class="flex-none min-h-[450px]">
      <el-card class="task-form-card !rounded-lg flex flex-col h-full overflow-hidden">
        <template #header>
          <Header
            :simpleMode="simpleMode"
            @toggle-simple-mode="simpleMode = !simpleMode"
            @open-advanced="advancedOpen = true"
          />
        </template>
        <el-form ref="taskFormRef" :rules="taskFormRules" :model="taskForm" class="flex flex-1 min-h-0" label-position="top">
          <LeftPanel
            :taskForm="taskForm"
            :accounts="accounts"
            :simpleMode="simpleMode"
            @reset-login="resetLogin"
            @update:platform="handlePlatformUpdate"
            @update:taskType="handleTaskTypeUpdate"
          />

          <RightPanel
            :keywordTags="keywordTags"
            :simpleMode="simpleMode"
            :taskForm="taskForm"
            :sortType="sortType"
            :publishTime="publishTime"
            :commentFilters="commentFilters"
            @update:keywords="handleUpdateKeywords"
            @update:commentFilters="updateCommentFilters"
            @start-task="startTask"
            @update:sortType="taskForm.sort_type = $event"
            @update:publishTime="taskForm.publish_time = $event"
            @open-comment-keywords="filterKeywordsDialogVisible = true"
          />
        </el-form>
        <!-- {{ taskForm }} -->
      </el-card>
    </div>
    <div class="flex-1 min-h-0">
      <LogTerminal :processState="processState" />
    </div>
    <AdvancedSettingsDialog
      v-model="advancedOpen"
      :config="advanced"
      @clear-cache="clearCache"
    />
    <!-- 关键字标签弹窗 -->
    <FilterKeywordsDialog
      v-model="filterKeywordsDialogVisible"
      :initial-selected="commentFilters"
      @confirm="handleFilterKeywordsConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import Header from './components/Header.vue'
import LeftPanel from './components/LeftPanel.vue'
import RightPanel from './components/RightPanel.vue'
import LogTerminal from './components/LogTerminal.vue'
import AdvancedSettingsDialog from './components/AdvancedSettingsDialog.vue'
import FilterKeywordsDialog from './components/FilterKeywordsDialog.vue'
import type { TaskConfig, AdvancedConfig, Platform, SearchMethod } from './types'
import { useCrawlerSettingsStore } from '../../store/crawlerSettings'
import { sortType, publishTime } from '../../constants/task'

const ipc = (window as any).ipcRenderer
const settingsStore = useCrawlerSettingsStore()

// 任务表单
const taskForm = reactive<TaskConfig>({
  platform: 'dy',
  type: 'search',
  id: '',
  accountId: '',
  keywords: '',
  filter_keywords: settingsStore.settings.filter_keywords.join(','),
  sort_type: sortType.items[0].value,
  publish_time: publishTime.items[0].value
})
// 表单规则
const taskFormRules = {
  platform: [{ required: true, message: '请选择社交媒体平台', trigger: 'change' }],
  type: [{ required: true, message: '请选择任务分类', trigger: 'change' }],
  id: [{ required: false, message: '请输入ID', trigger: 'blur' }],
  keywords: [{ required: true, message: `请输入搜索关键词`, trigger: 'blur' }],
  filter_keywords: [{ required: false, message: '请输入评论提取的关键字', trigger: 'blur' }]
}
// 界面模式
const simpleMode = ref(false)

// 切换社交媒体平台
const handlePlatformUpdate = (val: string) => {
  taskForm.platform = val as Platform
}
// 切换任务类型
const defaultUrl = {
  dy_detail: 'https://www.douyin.com/user/MS4wLjABAAAAi0JIKW9a-2BYYr7WG3yc491JV2rxVpQQGyAgNuG0q7wEDtB4TG1OOiP6lbHbZZHN?from_tab_name=main&modal_id=7549911731263917370',
  dy_creator: 'https://www.douyin.com/user/MS4wLjABAAAAi0JIKW9a-2BYYr7WG3yc491JV2rxVpQQGyAgNuG0q7wEDtB4TG1OOiP6lbHbZZHN?from_tab_name=main',
  xhs_detail: 'https://www.xiaohongshu.com/explore/683e52bc0000000021008b54?source=webshare&xhsshare=pc_web&xsec_token=CBDEoEPi_7imLiYV65pQCE-f3po4rulf1MlgJLeJWtU4E=&xsec_source=pc_share',
  xhs_creator: 'https://www.xiaohongshu.com/user/profile/670dc92c000000001d023f61?xsec_token=ABxbsAzSMGYM-9T2rFFeqZ5AR8J8nyVYKrkSgvXaXE6sk=&xsec_source=pc_note'
}
const handleTaskTypeUpdate = (type: string) => {
  taskForm.type = type as SearchMethod
  
  // console.log('handleTypeChange', type)
  if (type === 'search') {
    keywordTags.value = ['创业', '外贸']
    taskForm.sort_type = sortType.items[0].value
    taskForm.publish_time = publishTime.items[0].value
  }
  if (type === 'detail') {
    keywordTags.value = [
      defaultUrl[`${taskForm.platform}_detail`]
    ]
    taskForm.sort_type = ''
    taskForm.publish_time = ''
  }
  if (type === 'creator') {
    keywordTags.value = [
      defaultUrl[`${taskForm.platform}_creator`]
    ]
    taskForm.sort_type = ''
    taskForm.publish_time = publishTime.items[0].value
  }
  // 重置 formRef 验证
  // taskFormRules.keywords[0].message = `请输入${keywordsLabel[props.taskForm.type]}`
  taskFormRef.value.clearValidate()
}

// 关键词
const keywordTags = ref(['创业', '外贸'])
const handleUpdateKeywords = (keywords: string[]) => {
  keywordTags.value = keywords
  const value = keywords.join(',')
  taskForm.keywords = value
}

// 任务状态、日志
const processState = ref<any>({
  task_id: '',
  isRunning: false,
  exitCode: 0,
  logs: []
})

// IPC 消息处理
const handleLog = (_: any, log: string) => {
  // 只在有正在运行的任务或者最近一次任务是当前任务时显示日志
  // 这里简化处理，直接显示所有日志
  if (processState.value.logs.length > 1000) {
    processState.value.logs.shift()
  }
  processState.value.logs.push(log)
}

const handleTaskUpdate = (_: any, data: any) => {
  // 只处理当前关注的任务
  if (processState.value.task_id && data.taskId !== processState.value.task_id) return
  
  if (data.type === 'running') {
    processState.value.isRunning = true
  } else if (data.type === 'completed') {
    processState.value.isRunning = false
    processState.value.exitCode = 0
    ElMessage.success('任务已完成')
  } else if (data.type === 'failed') {
    processState.value.isRunning = false
    processState.value.exitCode = 1
    ElMessage.error(`任务失败: ${data.error || '未知错误'}`)
  }
}

// 加载任务日志
const loadTaskLogs = async (taskId: string) => {
  if (!taskId) return
  try {
    const logs = await ipc.invoke('task:logs:read', taskId)
    if (Array.isArray(logs) && logs.length > 0) {
      processState.value.logs = logs
      // 滚动到底部 (需要在 nextTick 后，这里依赖 Watcher)
    }
  } catch (e) {
    console.error('Failed to load logs', e)
  }
}

const advancedOpen = ref(false)
const advanced = reactive<AdvancedConfig>({
  enableCommentCrawl: settingsStore.settings.get_comment,
  enableSecondLevel: settingsStore.settings.get_sub_comment,
  collectCount: settingsStore.settings.max_notes_count,
  collectAuthorInfo: settingsStore.settings.enable_get_user_details,
  commentCount: settingsStore.settings.max_comments_count,
  intervalSec: settingsStore.settings.max_sleep_sec,
  enableCommentFilter: settingsStore.settings.comment_filter
})

const accounts = ref<any[]>([])

// 评论过滤
const commentFilters = ref<string[]>([])
commentFilters.value = settingsStore.settings.filter_keywords
const filterKeywordsDialogVisible = ref(false)

const handleFilterKeywordsConfirm = (keywords: string[]) => {
  commentFilters.value = keywords
  taskForm.filter_keywords = keywords.join(',')
}
// 评论过滤结束

// Sync advanced settings with store
watch(advanced, (newVal) => {
  settingsStore.settings.get_comment = newVal.enableCommentCrawl
  settingsStore.settings.get_sub_comment = newVal.enableSecondLevel
  settingsStore.settings.max_notes_count = newVal.collectCount
  settingsStore.settings.enable_get_user_details = newVal.collectAuthorInfo
  settingsStore.settings.max_comments_count = newVal.commentCount
  settingsStore.settings.max_sleep_sec = newVal.intervalSec
  settingsStore.settings.comment_filter = newVal.enableCommentFilter
}, { deep: true })

// Sync store changes to advanced settings
watch(() => settingsStore.settings, (newSettings) => {
  advanced.enableCommentCrawl = newSettings.get_comment
  advanced.enableSecondLevel = newSettings.get_sub_comment
  advanced.collectCount = newSettings.max_notes_count
  advanced.collectAuthorInfo = newSettings.enable_get_user_details
  advanced.commentCount = newSettings.max_comments_count
  advanced.intervalSec = newSettings.max_sleep_sec
  advanced.enableCommentFilter = newSettings.comment_filter
}, { deep: true })

// Initialize comment filters from store if available
if (settingsStore.settings.filter_keywords && settingsStore.settings.filter_keywords.length > 0) {
  commentFilters.value = [...settingsStore.settings.filter_keywords]
}

// Sync comment filters to store
watch(commentFilters, (newFilters) => {
  settingsStore.settings.filter_keywords = [...newFilters]
}, { deep: true })

// Actions
const loadAccounts = async () => {
  try {
    const res = await ipc.invoke('account:list')
    accounts.value = Array.isArray(res) ? res : []
    
    // 默认选择账号逻辑
    if (accounts.value.length > 0) {
      const lastAccountId = localStorage.getItem('last_account_id')
      if (lastAccountId && accounts.value.some(acc => acc.account_id === lastAccountId)) {
        taskForm.accountId = lastAccountId
      } else {
        taskForm.accountId = accounts.value[0].account_id
      }
    } else {
      taskForm.accountId = ''
    }
  } catch {
    accounts.value = []
    taskForm.accountId = ''
  }
}

watch(() => taskForm.accountId, (newVal) => {
  if (newVal) {
    localStorage.setItem('last_account_id', newVal)
  }
})

const updateCommentFilters = (v: Array<string>) => {
  commentFilters.value = v
  taskForm.filter_keywords = v.join(',')
}

const resetLogin = async () => {
  try {
    const res = await ipc.invoke('account:add', { platform: 'dy' })
    if (res?.success) {
      ElMessage.success('已触发登录流程')
      loadAccounts()
      return
    }
    ElMessage.warning(res?.message || '登录流程未完成')
  } catch (err: any) {
    ElMessage.error(err?.message || '登录失败')
  }
}

const clearCache = () => {
  ElMessage.success('缓存已清理')
}

// 表单提交
const taskFormRef = ref()
const isStarting = ref(false)
const startTask = async () => {
  if (!taskFormRef.value || isStarting.value) return
  isStarting.value = true
  // 表单验证
  try {
    await taskFormRef.value.validate(async (valid: boolean, fields?: Record<string, unknown>) => {
      if (valid) {
        console.log('start')
        const taskData = {
          name: `新建任务-${Date.now()}`,
          parameters: {
            platform: taskForm.platform,
            crawlType: taskForm.type,
            keywords: taskForm.keywords,
            sortType: taskForm.sort_type,
            publishTime: taskForm.publish_time,
            commentFilters: taskForm.filter_keywords,
            accountId: taskForm.accountId,
            advanced: { ...advanced }
          },
          schedule_type: null,
          schedule_enabled: 0,
          schedule_at: null,
          schedule_interval_ms: null
        }
        try {
          const { taskId } = await ipc.invoke('task:create', taskData)
          
          // 立即启动任务
          processState.value.task_id = taskId
          localStorage.setItem('last_task_id', taskId)
          processState.value.logs = []
          processState.value.isRunning = true
          processState.value.exitCode = 0
          
          await ipc.invoke('task:start', taskId)
          ElMessage.success('任务已创建并开始运行')
        } catch (err: any) {
          processState.value.isRunning = false
          ElMessage.error(err?.message || '创建/启动任务失败')
        }
      } else {
        console.log('error submit!!', fields)
      }
    })
  } finally {
    // 延迟 500ms 恢复按钮状态，防止极短时间内多次点击
    setTimeout(() => {
      isStarting.value = false
    }, 500)
  }
  // 
  /* if (!keywords.value.length && taskType.value === 'search') {
    ElMessage.warning('请先添加搜索关键词')
    return
  }
  const taskData = {
    name: `新建任务-${Date.now()}`,
    parameters: {
      platform: taskForm.platform,
      crawlType: taskForm.taskType,
      keywords: taskForm.keywords,
      sortType: taskForm.sortType,
      publishTime: taskForm.publishTime,
      commentFilters: taskForm.commentFilters,
      advanced: { ...advanced }
    },
    schedule_type: null,
    schedule_enabled: 0,
    schedule_at: null,
    schedule_interval_ms: null
  }
  try {
    await ipc.invoke('task:create', taskData)
    ElMessage.success('任务已创建')
  } catch (err: any) {
    ElMessage.error(err?.message || '创建任务失败')
  } */
}

onMounted(() => {
  taskForm.keywords = keywordTags.value.join(',')
  loadAccounts()
  
  // 注册日志监听
  ipc.on('task:log', handleLog)
  ipc.on('task:update', handleTaskUpdate)

  // 尝试恢复最近一次的任务状态（如果有）
  // 这里可以从 localStorage 或 store 中恢复 taskId
  const lastTaskId = localStorage.getItem('last_task_id')
  if (lastTaskId) {
    processState.value.task_id = lastTaskId
    loadTaskLogs(lastTaskId)
  }
})

onUnmounted(() => {
  ipc.off('task:log', handleLog)
  ipc.off('task:update', handleTaskUpdate)
})
</script>

<style scoped lang="scss">
@reference "tailwindcss";

.task-form-card {
  :deep(.el-card__header) {
    @apply flex items-center justify-between shrink-0 z-10 px-4 py-2;
  }
  :deep(.el-card__body) {
    padding: 0;
    @apply flex flex-col h-full overflow-hidden;
  }
}
:deep(.el-form) {
  .el-form-item {
    .el-form-item__label {
      @apply flex;
    }
  }
}

.filter-keywords-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .add-row {
    display: flex;
    gap: 10px;
  }

  .library-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .lib-tag {
    cursor: pointer;
  }

  .no-library {
    color: #9e9e9e;
  }
}
</style>
