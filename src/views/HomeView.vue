<template>
  <div class="mx-auto space-y-6 pb-6">
    <!-- Hero Section -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 p-8 sm:p-10 text-white shadow-lg">
      <div class="absolute -right-10 -top-10 opacity-10 pointer-events-none">
        <Activity :size="240" stroke-width="1" />
      </div>
      <div class="relative z-10">
        <div class="flex items-center gap-2 mb-4">
          <span class="px-3 py-1 text-xs font-semibold bg-white/20 rounded-full backdrop-blur-sm border border-white/10">v1.0.0</span>
          <span class="text-blue-100 text-sm flex items-center gap-1"><Zap :size="14"/> 高效媒体采集引擎</span>
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">欢迎使用 MediaTracer</h1>
        <p class="text-blue-100/90 mb-8 max-w-2xl leading-relaxed text-sm sm:text-base">
          基于 Electron + Playwright 的桌面端媒体采集与任务调度平台。支持按关键词搜索、作品详情、创作者主页等多种模式采集，帮助您统一管理多平台账号资产与数据导出流程。
        </p>
        <div class="flex flex-wrap gap-4">
          <button @click="router.push('/tasks/new')" class="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-sm">
            <Plus :size="18" /> 新建采集任务
          </button>
          <button @click="router.push('/tasks')" class="flex items-center gap-2 px-6 py-3 bg-blue-700/40 border border-blue-500/50 text-blue-600 rounded-xl font-medium hover:bg-blue-700/60 transition-colors backdrop-blur-sm">
            <ListTodo :size="18" /> 任务管理
          </button>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- 任务状态 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex justify-between items-start mb-4">
          <div>
            <div class="text-gray-500 text-sm font-medium mb-1">运行任务</div>
            <div class="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{{ overview.taskTotal }}</div>
          </div>
          <div class="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Activity :size="22" />
          </div>
        </div>
        <div class="flex items-center gap-3 text-xs text-gray-500 mt-2">
          <span class="flex items-center gap-1"><div class="w-2 h-2 rounded-full bg-emerald-500"></div>{{ overview.running }} 进行中</span>
          <span class="flex items-center gap-1"><div class="w-2 h-2 rounded-full bg-gray-400"></div>{{ overview.completed }} 已完成</span>
          <span class="flex items-center gap-1"><div class="w-2 h-2 rounded-full bg-rose-500"></div>{{ overview.failed }} 异常</span>
        </div>
      </div>

      <!-- 数据总量 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex justify-between items-start mb-4">
          <div>
            <div class="text-gray-500 text-sm font-medium mb-1">数据总量</div>
            <div class="text-2xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{{ overview.recordsTotal }}</div>
          </div>
          <div class="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Database :size="22" />
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <CheckCircle2 :size="14" class="text-emerald-500" />
          涵盖评论、作品与创作者数据
        </div>
      </div>

      <!-- 账号资产 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex justify-between items-start mb-4">
          <div>
            <div class="text-gray-500 text-sm font-medium mb-1">账号资产</div>
            <div class="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{{ overview.accountTotal }}</div>
          </div>
          <div class="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <Users :size="22" />
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <CheckCircle2 :size="14" class="text-purple-500" />
          已接管多平台登录状态
        </div>
      </div>

      <!-- 调度状态 -->
      <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
        <div class="flex justify-between items-start mb-4">
          <div>
            <div class="text-gray-500 text-sm font-medium mb-1">自动化调度</div>
            <div class="text-2xl font-bold transition-colors" :class="overview.running > 0 ? 'text-blue-600' : overview.scheduleEnabled > 0 ? 'text-orange-500' : 'text-gray-900'">
              {{ overview.running > 0 ? '执行中' : overview.scheduleEnabled > 0 ? '已排程' : '待命' }}
            </div>
          </div>
          <div class="p-2.5 rounded-xl" :class="overview.running > 0 ? 'bg-blue-50 text-blue-600' : overview.scheduleEnabled > 0 ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-500'">
            <Clock :size="22" />
          </div>
        </div>
        <div class="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <CalendarClock :size="14" :class="overview.scheduleEnabled > 0 ? 'text-orange-500' : 'text-gray-400'" />
          {{ overview.scheduleEnabled }} 个定时任务守护中
        </div>
      </div>
    </div>

    <!-- Bottom Section: Features and Steps -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 功能导览 (2/3 width) -->
      <div class="lg:col-span-2 space-y-4">
        <div class="flex items-center gap-2 px-1">
          <FileSpreadsheet :size="20" class="text-indigo-500" />
          <h2 class="text-lg font-bold text-gray-900">核心模块</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div v-for="feature in features" :key="feature.title" 
            class="bg-white rounded-2xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden"
            @click="router.push(feature.path)">
            <!-- decorative gradient blob -->
            <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500 blur-2xl" :class="getFeatureIconBg(feature.title)"></div>
            
            <div class="relative z-10">
              <div class="flex items-center gap-4 mb-3">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm text-white" :class="getFeatureIconBg(feature.title)">
                  <component :is="feature.icon" :size="22" />
                </div>
                <div class="text-[17px] font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{{ feature.title }}</div>
              </div>
              <div class="text-sm text-gray-500 leading-relaxed mb-4">{{ feature.desc }}</div>
              <div class="text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-[-10px] group-hover:translate-x-0">
                立即前往 <ChevronRight :size="14" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 使用流程 (1/3 width) -->
      <div class="space-y-4 flex flex-col h-full">
        <div class="flex items-center gap-2 px-1">
          <Zap :size="20" class="text-orange-500" />
          <h2 class="text-lg font-bold text-gray-900">快速上手</h2>
        </div>
        <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative flex-1">
          <div class="absolute left-[35px] top-10 bottom-10 w-px bg-gray-100 z-0"></div>
          <div class="space-y-6 relative z-10">
            <div v-for="(step, index) in steps" :key="step.title" class="flex gap-4 group">
              <div class="w-6 h-6 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-blue-500 transition-colors relative z-10">
                <div class="w-2 h-2 rounded-full bg-transparent group-hover:bg-blue-500 transition-colors"></div>
              </div>
              <div>
                <div class="text-sm font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{{ step.title }}</div>
                <div class="text-xs text-gray-500 leading-relaxed">{{ step.desc }}</div>
              </div>
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
  ChevronRight,
  Zap,
  CheckCircle2,
  Clock
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
  { id: '01', title: '配置账号与参数', desc: '在系统设置中确认数据库路径，完成账号登录保存。' },
  { id: '02', title: '创建采集任务', desc: '在任务中心设置关键词、采集模式和调度策略。' },
  { id: '03', title: '实时观察进度', desc: '任务执行过程可在任务列表查看状态和日志更新。' },
  { id: '04', title: '处理导出结果', desc: '查询、筛选并导出评论、作品和作者数据。' }
]

const features = [
  { title: '任务管理', desc: '创建、编辑、启动和停止采集任务，支持循环调度。', path: '/tasks', icon: ListTodo },
  { title: '数据中心', desc: '统一浏览采集数据，支持批量删除与导出 Excel。', path: '/data', icon: Database },
  { title: '账号管理', desc: '维护登录账号与 Cookie 复用，降低重复登录成本。', path: '/accounts', icon: Users },
  { title: '系统设置', desc: '配置数据库、日志目录和无头模式，优化运行稳定性。', path: '/settings', icon: Settings }
]

const getFeatureIconBg = (title: string) => {
  if (title.includes('任务')) return 'bg-rose-500'
  if (title.includes('数据')) return 'bg-emerald-500'
  if (title.includes('账号')) return 'bg-purple-500'
  if (title.includes('设置')) return 'bg-slate-700'
  return 'bg-blue-500'
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
