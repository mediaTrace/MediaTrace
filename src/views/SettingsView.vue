<template>
  <el-card class="settings-container">
    <template #header>
      <div class="flex w-full justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Settings :size="24" />
          </div>
          <div>
            <div class="text-lg font-bold">系统设置</div>
            <p class="text-xs text-gray-500">管理数据库、日志和运行模式配置</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <el-button :loading="loading" @click="loadSettings">
            <RefreshCw :size="14" class="mr-1.5" /> 刷新
          </el-button>
          <el-button type="primary" :loading="saving" @click="save">
            <Save :size="14" class="mr-1.5" /> 保存设置
          </el-button>
        </div>
      </div>
    </template>

    <div class="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
      <Info :size="20" class="mt-0.5 shrink-0" />
      <div>
        <h3 class="text-sm font-bold mb-1">设置说明</h3>
        <p class="text-xs leading-relaxed">
          修改数据库路径会在新路径初始化数据文件，日志路径与保留时间将立即生效并触发过期日志清理。
        </p>
      </div>
    </div>

    <el-form :model="form" label-position="top" class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="rounded-xl border border-gray-100 bg-white p-4">
          <div class="flex items-center gap-2 mb-4 text-sm font-bold text-gray-800">
            <Database :size="16" />
            存储设置
          </div>
          <el-form-item label="数据库路径" class="!mb-4">
            <div class="flex w-full gap-2">
              <el-input v-model="form.dbPath" placeholder="请输入数据库文件路径" />
              <el-button @click="pickDirectory('dbPath')">
                <FolderOpen :size="14" class="mr-1.5" /> 选择
              </el-button>
            </div>
          </el-form-item>
          <div class="text-xs text-gray-500">建议将数据库放在稳定磁盘路径，避免频繁移动目录。</div>
        </div>

        <div class="rounded-xl border border-gray-100 bg-white p-4">
          <div class="flex items-center gap-2 mb-4 text-sm font-bold text-gray-800">
            <FileText :size="16" />
            日志设置
          </div>
          <el-form-item label="日志路径" class="!mb-4">
            <div class="flex w-full gap-2">
              <el-input v-model="form.logPath" placeholder="请输入日志目录路径" />
              <el-button @click="pickDirectory('logPath')">
                <FolderOpen :size="14" class="mr-1.5" /> 选择
              </el-button>
            </div>
          </el-form-item>
          <el-form-item label="日志保留天数" class="!mb-0">
            <div class="flex items-center gap-2">
              <!-- <Clock3 :size="14" class="text-gray-400" /> -->
              <el-input-number v-model="form.logRetentionDays" :min="1" :max="365" />
              <span class="text-xs text-gray-500">天</span>
            </div>
          </el-form-item>
          <div class="mt-4 pt-4 border-t border-gray-100">
            <el-button type="danger" plain :loading="clearingLogs" @click="clearLogs">
              <Trash2 :size="14" class="mr-1.5" /> 手动清除日志
            </el-button>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-100 bg-white p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-bold text-gray-800">运行模式</div>
            <p class="text-xs text-gray-500 mt-1">开启后将以无头浏览器方式执行任务，适合后台稳定运行。</p>
          </div>
          <el-switch v-model="form.headless" />
        </div>
      </div>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Settings, RefreshCw, Save, Info, Database, FolderOpen, FileText, Trash2 } from 'lucide-vue-next'

const form = ref({
  dbPath: '',
  logPath: '',
  logRetentionDays: 7,
  headless: false
})
const loading = ref(false)
const saving = ref(false)
const clearingLogs = ref(false)

const loadSettings = async () => {
  loading.value = true
  try {
    const res = await window.ipcRenderer.invoke('settings:get')
    form.value.dbPath = String(res?.dbPath || '')
    form.value.logPath = String(res?.logPath || '')
    form.value.logRetentionDays = Number(res?.logRetentionDays || 7)
    form.value.headless = Boolean(res?.headless)
  } catch (err: any) {
    ElMessage.error(err?.message || '读取系统设置失败')
  } finally {
    loading.value = false
  }
}

const pickDirectory = async (field: 'dbPath' | 'logPath') => {
  try {
    const currentPath = form.value[field]
    const res = await window.ipcRenderer.invoke('settings:pick-directory', currentPath)
    if (!res?.canceled && res?.path) {
      if (field === 'dbPath') {
        const separator = String(res.path).includes('\\') ? '\\' : '/'
        form.value.dbPath = `${res.path}${separator}database.sqlite`
      } else {
        form.value.logPath = res.path
      }
    }
  } catch (err: any) {
    ElMessage.error(err?.message || '选择目录失败')
  }
}

const save = async () => {
  if (!form.value.dbPath.trim() || !form.value.logPath.trim()) {
    ElMessage.warning('请先填写数据库路径和日志路径')
    return
  }
  saving.value = true
  try {
    await window.ipcRenderer.invoke('settings:save', {
      dbPath: form.value.dbPath.trim(),
      logPath: form.value.logPath.trim(),
      logRetentionDays: Number(form.value.logRetentionDays),
      headless: form.value.headless
    })
    ElMessage.success('系统设置已保存')
  } catch (err: any) {
    ElMessage.error(err?.message || '保存系统设置失败')
  } finally {
    saving.value = false
  }
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm('将删除当前日志目录下的全部 .log 文件，是否继续？', '清除日志', {
      confirmButtonText: '立即清除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    clearingLogs.value = true
    const res = await window.ipcRenderer.invoke('settings:clear-logs')
    ElMessage.success(`已清除 ${Number(res?.deletedCount || 0)} 个日志文件`)
  } catch (err: any) {
    if (err !== 'cancel') {
      ElMessage.error(err?.message || '清除日志失败')
    }
  } finally {
    clearingLogs.value = false
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.settings-container {
  @apply h-full;
  :deep(.el-card__header) {
    @apply flex items-center justify-between shrink-0 z-10 px-4 py-2;
  }
  :deep(.el-card__body) {
    @apply flex-1 flex flex-col h-full overflow-auto p-4;
  }
}
</style>
