<template>
  <div class="home-container space-y-4">
    <el-card class="home-card !rounded-lg">
      <template #header>
        <div class="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity :size="24" />
            </div>
            <div>
              <div class="text-lg font-bold">欢迎使用 MediaTracer</div>
              <p class="text-xs text-gray-500">基于 Electron + Playwright 的桌面端媒体采集与任务调度平台</p>
            </div>
          </div>
          <!-- <el-button :loading="loading" @click="loadOverview">
            <RefreshCw :size="14" class="mr-1.5" /> 刷新概览
          </el-button> -->
        </div>
      </template>

      <div class="space-y-4">
        <div class="intro-panel">
          <div class="intro-title">核心能力</div>
          <div class="intro-tags">
            <span class="intro-tag">多模式采集</span>
            <span class="intro-tag">定时调度</span>
            <span class="intro-tag">多账号复用</span>
            <span class="intro-tag">多存储导出</span>
          </div>
          <p class="intro-desc">
            支持按关键词搜索、作品详情、创作者主页三种模式采集，可统一管理账号 Cookie、任务状态与数据导出流程，适用于运营监测、舆情分析和线索沉淀场景。
          </p>
          <div class="flex flex-wrap gap-2">
            <el-button type="primary" @click="router.push('/tasks/new')">
              <Plus :size="14" class="mr-1.5" /> 新建采集任务
            </el-button>
            <el-button @click="router.push('/tasks')">
              <ListTodo :size="14" class="mr-1.5" /> 任务管理
            </el-button>
            <el-button @click="router.push('/data')">
              <Database :size="14" class="mr-1.5" /> 数据中心
            </el-button>
            <el-button @click="router.push('/settings')">
              <Settings :size="14" class="mr-1.5" /> 系统设置
            </el-button>
          </div>
        </div>

        <div class="stats-grid">
          <el-card shadow="hover">
            <div class="stat-item">
              <div class="label">任务总数</div>
              <div class="value text-indigo-600">{{ overview.taskTotal }}</div>
              <div class="text-xs text-gray-500 mt-1">
                运行中 {{ overview.running }} / 完成 {{ overview.completed }} / 失败 {{ overview.failed }}
              </div>
            </div>
          </el-card>
          <el-card shadow="hover">
            <div class="stat-item">
              <div class="label">数据总量</div>
              <div class="value text-blue-600">{{ overview.recordsTotal }}</div>
              <div class="text-xs text-gray-500 mt-1">统计评论、作品与作者三类数据表</div>
            </div>
          </el-card>
          <el-card shadow="hover">
            <div class="stat-item">
              <div class="label">账号数量</div>
              <div class="value text-emerald-600">{{ overview.accountTotal }}</div>
              <div class="text-xs text-gray-500 mt-1">已接入抖音登录账号</div>
            </div>
          </el-card>
          <el-card shadow="hover">
            <div class="stat-item">
              <div class="label">调度状态</div>
              <div class="value text-orange-500">
                {{ overview.running > 0 ? '执行中' : overview.scheduleEnabled > 0 ? '已排程' : '待命' }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                已启用调度 {{ overview.scheduleEnabled }} 个，支持一次性与循环任务
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-card>

    <!-- 使用流程 -->
    <div class="mt-6 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
      <div class="mb-6 flex items-center gap-2">
        <CalendarClock :size="20" class="text-blue-500" />
        <div class="text-lg font-bold text-gray-900">使用流程</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="step in steps" :key="step.title" class="group">
          <div class="text-3xl font-light text-gray-300 mb-2 font-mono group-hover:text-blue-500 transition-colors">{{ step.id }}</div>
          <div class="text-[15px] font-bold text-gray-800 mb-2">{{ step.title }}</div>
          <div class="text-xs text-gray-500 leading-relaxed">{{ step.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 功能导览 -->
    <div class="mt-6 mb-4 bg-white rounded-lg p-5 shadow-sm border border-gray-100">
      <div class="mb-6 flex items-center gap-2">
        <FileSpreadsheet :size="20" class="text-indigo-500" />
        <div class="text-lg font-bold text-gray-900">功能导览</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="feature in features" :key="feature.title" class="rounded-2xl p-6 transition-all duration-300 cursor-pointer group flex flex-col border border-transparent hover:shadow-md hover:-translate-y-1" :class="getFeatureCardBg(feature.title)" @click="router.push(feature.path)">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" :class="getFeatureIconBg(feature.title)">
              <component :is="feature.icon" :size="24" class="text-white" />
            </div>
            <div class="text-[17px] font-bold text-gray-900">{{ feature.title }}</div>
          </div>
          <div class="text-sm text-gray-600 leading-relaxed flex-1">{{ feature.desc }}</div>
          <div class="mt-6">
            <div class="inline-flex items-center px-4 py-1.5 rounded-full bg-white/60 text-xs font-bold text-gray-800 group-hover:bg-white group-hover:text-blue-600 transition-all border border-white/50 shadow-sm">
              立即开始 <span class="ml-1 text-[10px]">↗</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Activity,
  Plus,
  ListTodo,
  Database,
  Settings,
  CalendarClock,
  FileSpreadsheet,
  Users,
  Play
} from 'lucide-vue-next'

const router = useRouter()
const loading = ref(false)
let overviewTimer: ReturnType<typeof setInterval> | null = null

const overview = ref({
  taskTotal: 0,
  running: 0,
  completed: 0,
  failed: 0,
  recordsTotal: 0,
  accountTotal: 0,
  scheduleEnabled: 0
})

const steps = [
  { id: '01', title: '配置账号与运行参数', desc: '在系统设置中确认数据库路径和运行模式，完成账号登录保存。' },
  { id: '02', title: '创建采集任务', desc: '在任务中心设置关键词、采集模式和调度策略。' },
  { id: '03', title: '实时观察进度', desc: '任务执行过程可在任务列表查看状态和日志更新。' },
  { id: '04', title: '进入数据中心处理结果', desc: '查询、筛选并导出评论、作品和作者数据。' }
]

const features = [
  { title: '任务管理', desc: '创建、编辑、启动和停止采集任务，支持循环调度。', path: '/tasks', icon: ListTodo },
  { title: '数据中心', desc: '统一浏览采集数据，支持批量删除与导出 Excel。', path: '/data', icon: Database },
  { title: '账号管理', desc: '维护登录账号与 Cookie 复用，降低重复登录成本。', path: '/accounts', icon: Users },
  { title: '系统设置', desc: '配置数据库、日志目录和无头模式，优化运行稳定性。', path: '/settings', icon: Settings }
]

const getFeatureIconBg = (title: string) => {
  if (title.includes('任务')) return 'bg-rose-500'
  if (title.includes('数据')) return 'bg-[#10b981]'
  if (title.includes('账号')) return 'bg-blue-500'
  if (title.includes('设置')) return 'bg-purple-500'
  return 'bg-gray-800'
}

const getFeatureCardBg = (title: string) => {
  if (title.includes('任务')) return 'bg-rose-50'
  if (title.includes('数据')) return 'bg-emerald-50'
  if (title.includes('账号')) return 'bg-blue-50'
  if (title.includes('设置')) return 'bg-purple-50'
  return 'bg-gray-50'
}

const queryTableTotal = async (table: string) => {
  try {
    const res = await window.ipcRenderer.invoke('data:query', {
      table,
      page: 1,
      pageSize: 1
    })
    return Number(res?.total || 0)
  } catch {
    return 0
  }
}

const invokeSafe = async <T>(channel: string, fallback: T): Promise<T> => {
  try {
    return await window.ipcRenderer.invoke(channel)
  } catch {
    return fallback
  }
}

const normalizeTaskList = (payload: any) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

const loadOverview = async () => {
  if (loading.value) return
  loading.value = true
  try {
    const [tasksRes, accounts, dyComments, dyVideos, dyCreators, xhsComments, xhsNotes, xhsCreators] = await Promise.all([
      invokeSafe<any[]>('task:list', []),
      invokeSafe<any[]>('account:list', []),
      queryTableTotal('douyin_aweme_comment'),
      queryTableTotal('douyin_aweme'),
      queryTableTotal('dy_creator'),
      queryTableTotal('xhs_note_comment'),
      queryTableTotal('xhs_note'),
      queryTableTotal('xhs_creator')
    ])

    const tasks = normalizeTaskList(tasksRes)
    const running = tasks.filter((item: any) => item.status === 'running').length
    const completed = tasks.filter((item: any) => item.status === 'completed').length
    const failed = tasks.filter((item: any) => item.status === 'failed').length
    const scheduleEnabled = tasks.filter((item: any) => Number(item.schedule_enabled) === 1).length

    overview.value = {
      taskTotal: tasks.length,
      running,
      completed,
      failed,
      recordsTotal: dyComments + dyVideos + dyCreators + xhsComments + xhsNotes + xhsCreators,
      accountTotal: Array.isArray(accounts) ? accounts.length : 0,
      scheduleEnabled
    }
  } finally {
    loading.value = false
  }
}

const handleAppFocus = () => {
  loadOverview()
}

const handleVisibilityChange = () => {
  if (!document.hidden) {
    loadOverview()
  }
}

onMounted(() => {
  loadOverview()
  window.ipcRenderer.on('task:update', loadOverview)
  window.addEventListener('focus', handleAppFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  overviewTimer = setInterval(() => {
    loadOverview()
  }, 5000)
})

onUnmounted(() => {
  window.ipcRenderer.off('task:update', loadOverview)
  window.removeEventListener('focus', handleAppFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (overviewTimer) {
    clearInterval(overviewTimer)
    overviewTimer = null
  }
})
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.home-container {
  @apply mx-auto;
}
.home-card {
  :deep(.el-card__header) {
    @apply flex items-center justify-between shrink-0 z-10 px-4 py-2;
  }
  :deep(.el-card__body) {
    @apply p-5;
  }
}
.intro-panel {
  @apply rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 space-y-3;
}
.intro-title {
  @apply text-sm font-bold text-gray-800;
}
.intro-tags {
  @apply flex flex-wrap gap-2;
}
.intro-tag {
  @apply text-xs px-2.5 py-1 rounded-full bg-white border border-blue-100 text-blue-600 font-medium;
}
.intro-desc {
  @apply text-sm text-gray-600 leading-relaxed;
}
.stats-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3;
}
.stat-item {
  @apply text-center py-2;
}
.label {
  @apply text-xs text-gray-500;
}
.value {
  @apply text-3xl font-bold mt-1;
}
</style>
