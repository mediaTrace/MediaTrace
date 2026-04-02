<template>
  <div class="tasks-view-container h-full flex flex-col rounded-sm shadow-2xl bg-white overflow-hidden">
    <div class="header bg-white shadow-sm space-y-4 border-b-[1px] border-gray-100">
      <div class="flex justify-between items-center px-4 py-2 border-b-[1px] border-gray-100 max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <ListTodo :size="24" />
          </div>
          <div>
            <div class="text-lg font-bold">任务管理</div>
            <p class="text-xs text-gray-500">创建与管理采集任务调度</p>
          </div>
        </div>
        <div class="flex gap-2">
          <el-button plain @click="loadTasks">
            <RefreshCw :size="14" class="mr-1.5" /> 刷新列表
          </el-button>
          <el-button type="primary" plain @click="openAddDialog">
            <Plus :size="14" class="mr-1.5" /> 新建任务
          </el-button>
        </div>
      </div>
      <div class="flex flex-col pb-4 2xl:flex-row 2xl:justify-between">
        <div class="flex items-center gap-6 text-sm px-4 flex-1 max-2xl:mb-4 max-lg:flex-col max-lg:items-start max-lg:gap-4">
          <div class="flex items-center gap-2">
            <Activity :size="14" class="text-gray-400" />
            <span class="text-gray-500">状态</span>
            <div class="flex bg-gray-100 rounded-lg p-1">
              <div 
                v-for="s in statusOptions" :key="s.value"
                class="px-3 py-1 rounded-md cursor-pointer transition-all text-xs"
                :class="filter.status === s.value ? 'bg-white text-[var(--el-color-primary)] shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
                @click="filter.status = s.value; loadTasks()"
              >{{ s.label }}</div>
            </div>
          </div>
        </div>
        <div class="flex gap-3 px-4 flex-1">
          <el-input 
            v-model="filter.keyword" 
            placeholder="搜索任务名称..." 
            prefix-icon="Search"
            class="flex-1 py-0"
            clearable
            @keyup.enter="loadTasks"
          />
          <el-button type="primary" @click="loadTasks">
            <Filter :size="14" class="mr-1.5" /> 查询
          </el-button>
        </div>
      </div>
    </div>
    <div class="flex-1 bg-white shadow-sm overflow-hidden flex flex-col">
      <el-table 
        :data="tasks" 
        v-loading="loading" 
        style="width: 100%"
        height="100%"
        header-cell-class-name="!bg-gray-50 !text-gray-600 !font-medium"
      >
        <el-table-column prop="task_name" label="任务名称" min-width="180">
          <template #default="{ row }">
            <div class="font-medium text-gray-800">{{ row.task_name }}</div>
            <div class="text-xs text-gray-400 mt-0.5 font-mono">ID: {{ row.task_id.substring(0, 8) }}...</div>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="120" align="center">
          <template #default="{ row }">
            <div class="flex justify-center">
              <span 
                class="px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5"
                :class="getStatusClass(row.status)"
              >
                <div class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(row.status)"></div>
                {{ getStatusLabel(row.status) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="调度配置" min-width="220">
           <template #default="{ row }">
             <div v-if="row.schedule_type" class="flex items-center gap-3">
               <el-switch 
                 v-model="row.schedule_enabled" 
                 :active-value="1" 
                 :inactive-value="0" 
                 size="small"
                 style="--el-switch-on-color: #6366f1"
                 @change="toggleSchedule(row)"
               />
               <div :class="{'opacity-50': !row.schedule_enabled}" class="flex flex-col">
                 <div class="flex items-center gap-2 text-xs">
                   <span class="px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 font-medium">
                     {{ row.schedule_type === 'interval' ? '循环' : '定时' }}
                   </span>
                   <span class="text-gray-600 font-mono">
                     {{ row.schedule_type === 'interval' ? formatDuration(row.schedule_interval_ms) : formatTime(row.schedule_at) }}
                   </span>
                 </div>
                 <!-- 倒计时显示 -->
                 <div v-if="row.schedule_enabled && row.schedule_next_run" class="text-[10px] text-indigo-500 mt-0.5 font-mono flex items-center gap-1">
                    <Clock :size="10" />
                    {{ getCountDown(row) }}
                 </div>
               </div>
             </div>
             <div v-else class="text-gray-400 text-xs italic">无调度</div>
           </template>
        </el-table-column>

        <el-table-column label="采集参数" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="flex flex-wrap gap-1">
              <span v-if="row.parameters?.keywords" class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                {{ row.parameters.keywords }}
              </span>
              <span v-if="row.parameters?.crawlType" class="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs border border-blue-100">
                {{ getCrawlTypeLabel(row.parameters.crawlType) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="执行时间" width="200">
          <template #default="{ row }">
            <div class="flex flex-col text-xs text-gray-500">
              <div class="flex justify-between">
                <span>开始:</span>
                <span class="font-mono">{{ formatTime(row.start_time) }}</span>
              </div>
              <div class="flex justify-between mt-0.5">
                <span>结束:</span>
                <span class="font-mono">{{ formatTime(row.end_time) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <div class="flex items-center justify-center gap-1">
              <el-tooltip content="启动任务" placement="top" :show-after="500">
                <button 
                  v-if="row.status !== 'running'" 
                  class="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  @click="startTask(row.task_id)"
                >
                  <Play :size="16" />
                </button>
                <button 
                  v-else 
                  class="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors animate-pulse"
                  @click="stopTask(row.task_id)"
                >
                  <Square :size="16" fill="currentColor" />
                </button>
              </el-tooltip>

              <el-tooltip content="编辑配置" placement="top" :show-after="500">
                <button 
                  class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  @click="openEditDialog(row)"
                >
                  <Settings2 :size="16" />
                </button>
              </el-tooltip>

              <el-tooltip content="删除任务" placement="top" :show-after="500">
                <button 
                  class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  @click="deleteTask(row.task_id)"
                >
                  <Trash2 :size="16" />
                </button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
        <div class="text-xs text-gray-500">
          总计 <span class="font-bold text-gray-800">{{ tasks.length }}</span> 个任务，运行中 <span class="font-bold text-emerald-600">{{ taskStats.running }}</span> 个，已完成 <span class="font-bold text-blue-600">{{ taskStats.completed }}</span> 个，失败 <span class="font-bold text-red-600">{{ taskStats.failed }}</span> 个
        </div>
        <el-button text type="primary" @click="loadTasks">
          <RefreshCw :size="14" class="mr-1.5" /> 立即刷新
        </el-button>
      </div>
    </div>

    <!-- Add/Edit Task Dialog -->
    <el-dialog 
      v-model="showAdd" 
      :title="isEdit ? '编辑任务' : '新建任务'" 
      width="600px"
      class="!rounded-2xl"
    >
      <el-form :model="form" label-width="100px" class="mt-4">
        <el-form-item label="任务名称">
          <el-input v-model="form.name" placeholder="给任务起个名字" />
        </el-form-item>
        <el-form-item label="选择账号">
          <el-select v-model="form.accountId" placeholder="不选择则使用扫码登录" clearable class="w-full">
            <el-option 
              v-for="acc in accounts" 
              :key="acc.account_id" 
              :label="acc.nickname || acc.account_id" 
              :value="acc.account_id" 
            >
              <div class="flex items-center gap-2">
                <el-avatar :size="24" :src="acc.avatar" />
                <span>{{ acc.nickname || acc.account_id }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input 
            v-model="form.keywords" 
            placeholder="请输入搜索关键词，多个用逗号分隔" 
            type="textarea" 
            :rows="3"
            resize="none"
          />
        </el-form-item>
        <el-form-item label="模式">
          <el-radio-group v-model="form.type">
            <el-radio-button label="search">搜索模式</el-radio-button>
            <el-radio-button label="detail">详情模式</el-radio-button>
            <el-radio-button label="creator">主页模式</el-radio-button>
          </el-radio-group>
        </el-form-item>
        
        <div class="bg-gray-50 rounded-xl p-4 mb-4">
          <div class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <CalendarClock :size="16" />
            调度配置
          </div>
          <el-form-item label="调度类型" class="!mb-0">
             <el-radio-group v-model="form.schedule_type">
               <el-radio label="">无</el-radio>
               <el-radio label="once">定时一次</el-radio>
               <el-radio label="interval">循环执行</el-radio>
             </el-radio-group>
          </el-form-item>
          
          <div v-if="form.schedule_type" class="mt-4 pl-[100px]">
            <el-date-picker
              v-if="form.schedule_type === 'once'"
              v-model="form.schedule_at"
              type="datetime"
              placeholder="选择执行时间"
              value-format="x"
              class="!w-full"
            />
            <el-input 
              v-if="form.schedule_type === 'interval'" 
              v-model.number="form.schedule_interval_value" 
              type="number" 
              :min="1"
            >
              <template #append>
                <el-select v-model="form.schedule_interval_unit" style="width: 80px">
                  <el-option label="秒" value="s" />
                  <el-option label="分" value="m" />
                  <el-option label="时" value="h" />
                </el-select>
              </template>
            </el-input>
          </div>
        </div>

        <el-form-item label="高级参数">
          <el-input 
            v-model="form.params" 
            placeholder="{}" 
            type="textarea" 
            :rows="2"
            class="font-mono text-xs"
            resize="none"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <el-button @click="showAdd = false">取消</el-button>
          <el-button type="primary" color="#6366f1" @click="submitTask">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { 
  ListTodo, Plus, Activity, Play, Square, Settings2, Trash2, 
  CalendarClock, Clock, Filter, RefreshCw
} from 'lucide-vue-next'

const tasks = ref([])
const loading = ref(false)
const showAdd = ref(false)
const isEdit = ref(false)
const now = ref(Date.now())
let timer: any = null

const filter = reactive({
  status: 'all',
  keyword: ''
})

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' }
]

const taskStats = computed(() => {
  return tasks.value.reduce(
    (acc: { running: number; completed: number; failed: number }, task: any) => {
      if (task.status === 'running') acc.running += 1
      if (task.status === 'completed') acc.completed += 1
      if (task.status === 'failed') acc.failed += 1
      return acc
    },
    { running: 0, completed: 0, failed: 0 }
  )
})

const form = ref({ 
  id: '', 
  name: '', 
  keywords: '', 
  type: 'search', 
  accountId: '', 
  params: '{}',
  schedule_type: '',
  schedule_at: null as number | null,
  schedule_interval_value: 60,
  schedule_interval_unit: 'm'
})
const accounts = ref<any[]>([])

const loadAccounts = async () => {
  try {
    const res = await window.ipcRenderer.invoke('account:list')
    accounts.value = res
  } catch (err) {
    console.error('Load accounts failed', err)
  }
}

const openAddDialog = async () => {
  isEdit.value = false
  form.value = { 
    id: '', 
    name: '', 
    keywords: '', 
    type: 'search', 
    accountId: '', 
    params: '{}',
    schedule_type: '',
    schedule_at: null,
    schedule_interval_value: 60,
    schedule_interval_unit: 'm'
  }
  showAdd.value = true
  await loadAccounts()
}

const openEditDialog = async (row: any) => {
  isEdit.value = true
  // 解析参数
  const params = row.parameters || {}
  const customParams = { ...params }
  delete customParams.keywords
  delete customParams.crawlType
  delete customParams.accountId
  
  // 计算 interval
  let intervalVal = 60
  let intervalUnit = 'm'
  const ms = row.schedule_interval_ms
  if (ms) {
    if (ms % 3600000 === 0) {
      intervalVal = ms / 3600000
      intervalUnit = 'h'
    } else if (ms % 60000 === 0) {
      intervalVal = ms / 60000
      intervalUnit = 'm'
    } else {
      intervalVal = ms / 1000
      intervalUnit = 's'
    }
  }

  form.value = {
    id: row.task_id,
    name: row.task_name,
    keywords: params.keywords || '',
    type: params.crawlType || 'search',
    accountId: params.accountId || '',
    params: JSON.stringify(customParams, null, 2),
    schedule_type: row.schedule_type || '',
    schedule_at: row.schedule_at,
    schedule_interval_value: intervalVal,
    schedule_interval_unit: intervalUnit
  }
  showAdd.value = true
  await loadAccounts()
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res = await window.ipcRenderer.invoke('task:list')
    // Client-side filtering for demo
    let items = res.items
    if (filter.status !== 'all') {
      items = items.filter((t: any) => t.status === filter.status)
    }
    if (filter.keyword) {
      const k = filter.keyword.toLowerCase()
      items = items.filter((t: any) => t.task_name?.toLowerCase().includes(k))
    }
    tasks.value = items
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const deleteTask = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个任务吗？', '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    await window.ipcRenderer.invoke('task:delete', id)
    ElMessage.success('删除成功')
    loadTasks()
  } catch (e) {
    if (e !== 'cancel') {
       console.error(e)
       ElMessage.error('删除失败: ' + (e as Error).message)
    }
  }
}

const submitTask = async () => {
  let customParams = {}
  try {
    if (form.value.params) {
      customParams = JSON.parse(form.value.params)
    }
  } catch (e) {
    console.error('Invalid JSON params', e)
    ElMessage.error('自定义参数格式错误')
    return
  }

  // 计算毫秒
  let intervalMs = 0
  if (form.value.schedule_type === 'interval') {
    const v = form.value.schedule_interval_value
    const u = form.value.schedule_interval_unit
    if (u === 's') intervalMs = v * 1000
    else if (u === 'm') intervalMs = v * 60000
    else if (u === 'h') intervalMs = v * 3600000
  }

  const taskData = {
    name: form.value.name,
    parameters: { 
      keywords: form.value.keywords,
      crawlType: form.value.type,
      accountId: form.value.accountId || undefined,
      ...customParams
    },
    schedule_type: form.value.schedule_type || null,
    schedule_enabled: form.value.schedule_type ? 1 : 0,
    schedule_at: form.value.schedule_type === 'once' ? form.value.schedule_at : null,
    schedule_interval_ms: form.value.schedule_type === 'interval' ? intervalMs : null
  }

  try {
    if (isEdit.value) {
       // 更新任务
       // 构造 patch 数据
       const patch = {
         task_name: taskData.name,
         parameters: taskData.parameters,
         schedule_type: taskData.schedule_type,
         schedule_enabled: taskData.schedule_enabled,
         schedule_at: taskData.schedule_at,
         schedule_interval_ms: taskData.schedule_interval_ms
       }
       await window.ipcRenderer.invoke('task:update', { taskId: form.value.id, data: patch })
       ElMessage.success('更新成功')
    } else {
       await window.ipcRenderer.invoke('task:create', taskData)
       ElMessage.success('创建成功')
    }
    showAdd.value = false
    loadTasks()
  } catch(err: any) {
    console.error(err)
    ElMessage.error('操作失败: ' + err.message)
  }
}

const startTask = async (id: string) => {
  try {
    await window.ipcRenderer.invoke('task:start', id)
    loadTasks()
  } catch (err: any) {
    console.error('Start failed', err)
    // 提取错误信息
    const msg = err.message ? err.message.replace(/Error: .*invoking.*: /, '') : String(err)
    ElMessage.warning('启动失败: ' + msg)
  }
}

const stopTask = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要强制停止该任务吗？停止后任务状态将标记为失败。', '停止确认', {
      confirmButtonText: '强制停止',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--warning'
    })
    const res = await window.ipcRenderer.invoke('task:stop', id)
    if (res.success) {
       ElMessage.success('任务已停止')
    } else {
       ElMessage.error('停止失败: ' + res.message)
    }
    loadTasks()
  } catch (e) {
    if (e !== 'cancel') {
       console.error(e)
       ElMessage.error('停止失败: ' + (e as Error).message)
    }
  }
}

const formatTime = (ts: number) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    running: '运行中',
    failed: '失败',
    completed: '已完成',
    pending: '等待中',
    stopped: '已停止'
  }
  return map[status] || status
}

const getStatusClass = (status: string) => {
  switch (status) {
    case 'running': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    case 'failed': return 'bg-red-50 text-red-600 border-red-100'
    case 'completed': return 'bg-blue-50 text-blue-600 border-blue-100'
    default: return 'bg-gray-50 text-gray-500 border-gray-100'
  }
}

const getStatusDotClass = (status: string) => {
  switch (status) {
    case 'running': return 'bg-emerald-500 animate-pulse'
    case 'failed': return 'bg-red-500'
    case 'completed': return 'bg-blue-500'
    default: return 'bg-gray-400'
  }
}

const getCrawlTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    search: '关键词搜索',
    detail: '帖子详情',
    creator: '主页采集'
  }
  return map[type] || type
}

const toggleSchedule = async (row: any) => {
  try {
    await window.ipcRenderer.invoke('task:update', { 
      taskId: row.task_id, 
      data: { schedule_enabled: row.schedule_enabled } 
    })
    ElMessage.success(row.schedule_enabled ? '调度已启用' : '调度已暂停')
  } catch (err: any) {
    console.error('Toggle schedule failed', err)
    row.schedule_enabled = row.schedule_enabled ? 0 : 1 // 恢复状态
    ElMessage.error('操作失败: ' + err.message)
  }
}

const formatDuration = (ms: number) => {
  if (!ms) return '-'
  if (ms % 3600000 === 0) return (ms / 3600000) + '小时'
  if (ms % 60000 === 0) return (ms / 60000) + '分钟'
  return (ms / 1000) + '秒'
}

const getCountDown = (row: any) => {
  if (!row.schedule_enabled || !row.schedule_next_run) return ''
  const diff = row.schedule_next_run - now.value
  if (diff <= 0) return ''
  
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  
  if (h > 0) return `${h}小时${m}分${s}秒后执行`
  if (m > 0) return `${m}分${s}秒后执行`
  return `${s}秒后执行`
}

onMounted(() => {
  loading.value = true
  loadTasks()
  
  // 监听任务状态更新
  window.ipcRenderer.on('task:update', (_event, _data) => {
    loadTasks()
  })
  
  // 启动倒计时定时器
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
:deep(.el-input__wrapper) {
  box-shadow: none;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
}
:deep(.el-input__wrapper:hover) {
  border-color: #d1d5db;
}
:deep(.el-input__wrapper.is-focus) {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1;
  background-color: #fff;
}
:deep(.el-select__wrapper) {
  box-shadow: none !important;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: #f9fafb;
}
:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}
:deep(.el-dialog__header) {
  margin-right: 0;
  border-bottom: 1px solid #f3f4f6;
  padding: 16px 24px;
}
:deep(.el-dialog__body) {
  padding: 24px;
}
:deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
}
</style>
