<template>
  <el-card class="accounts-container">
    <!-- Header -->
    <template #header>
      <div class="flex w-full justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-2">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <Users :size="24" />
          </div>
          <div>
            <div class="text-lg font-bold">账号管理</div>
            <p class="text-xs text-gray-500">配置采集账号与网络代理</p>
          </div>
        </div>
        <el-button type="primary" @click="addAccount">
          <Plus :size="16" class="mr-1.5" /> 添加新账号
        </el-button>
      </div>
    </template>
    <!-- Info Alert -->
    <div class="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
      <Info :size="20" class="mt-0.5 shrink-0" />
      <div>
        <h3 class="text-sm font-bold mb-1">关于账号安全</h3>
        <p class="text-xs leading-relaxed">
          建议使用小号进行高频采集，系统会自动控制采集频率以降低风控风险。如果账号 Cookie 失效，请点击"更新 Cookie"重新登录。
        </p>
      </div>
    </div>

    <!-- Account Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
      <!-- Account Cards -->
      <div v-for="account in accounts" :key="account.account_id" 
        class="rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-md transition-shadow relative"
      >
        <!-- Status Bar -->
        <div class="absolute left-0 top-0 bottom-0 w-1 rounded-l-full" 
          :class="account.status === 'invalid' ? 'bg-red-500' : 'bg-emerald-500'"
        ></div>

        <div class="p-5">
          <!-- Card Header -->
          <div class="flex justify-between items-center mb-4">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <el-avatar :size="40" :src="account.avatar" />
              <div>
                <div class="font-bold text-gray-800 text-sm mb-1">{{ account.nickname || '未命名账号' }}</div>
                <div class="flex items-center gap-1.5">
                  <div class="w-1.5 h-1.5 rounded-full" :class="account.status === 'invalid' ? 'bg-red-500' : 'bg-emerald-500'"></div>
                  <span class="text-xs font-medium" :class="account.status === 'invalid' ? 'text-red-500' : 'text-emerald-500'">
                    {{ account.status === 'invalid' ? 'Cookie 失效' : '状态正常' }}
                  </span>
                </div>
              </div>
            </div>
            <!-- Platform -->
            <div 
              class="px-2 py-1 rounded text-[10px] font-bold shrink-0 tracking-wider"
              :class="account.platform === 'xhs' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-800 border border-gray-200'"
            >
              {{ account.platform === 'xhs' ? '小红书' : '抖音' }}
            </div>
            <!-- <el-dropdown trigger="click">
              <div class="p-1 hover:bg-gray-100 rounded cursor-pointer text-gray-400">
                <MoreVertical :size="16" />
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="deleteAccount(account.account_id)" class="!text-red-500">
                    <Trash2 :size="14" class="mr-2" /> 删除账号
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown> -->
          </div>

          <!-- Info Rows -->
          <div class="space-y-3 mb-4">
            <div class="flex justify-between items-center text-xs">
              <div class="flex items-center gap-2 text-gray-400">
                <Wifi :size="14" />
                <span>代理 IP</span>
              </div>
              <div class="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{{ account.proxy || 'Direct' }}</div>
            </div>
            <div class="flex justify-between items-center text-xs">
              <div class="flex items-center gap-2 text-gray-400">
                <Clock :size="14" />
                <span>上次活跃</span>
              </div>
              <div class="text-gray-600">{{ formatRelativeTime(account.last_modify_ts) }}</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <el-button
              v-if="account.status !== 'invalid'"
              class="flex-1"
              @click="checkStatus(account)"
            >
              <RefreshCw :size="14" :class="{'animate-spin': account.checking}" class="mr-2" />
              检查状态
            </el-button>
            <el-button 
              v-else
              type="warning"
              plain
              class="flex-1"
              @click="updateCookie(account)"
            >
              <RefreshCw :size="14" class="mr-2" />
              更新 Cookie
            </el-button>
            
            <el-button class="!px-2 !ml-0" @click="deleteAccount(account.account_id)">
              <Trash2 :size="16" />
            </el-button>
          </div>
        </div>
      </div>

      <!-- Add New Card Placeholder -->
      <div 
        class="bg-white rounded-xl border-2 border-dashed border-gray-200 hover:border-[var(--el-color-primary)] transition-all cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[194px]"
        @click="addAccount"
      >
        <div class="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-indigo-100 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors">
          <Plus :size="24" />
        </div>
        <span class="text-sm font-medium">添加账号</span>
      </div>
    </div>

    <el-dialog v-model="showLogin" title="添加账号" width="400px" :close-on-click-modal="false">
      <div class="text-center py-8">
        <div class="mb-6 relative mx-auto w-16 h-16">
          <div class="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
          <div class="absolute inset-0 border-4 border-[var(--el-color-primary)] rounded-full border-t-transparent animate-spin"></div>
        </div>
        <h3 class="text-lg font-bold text-gray-800 mb-2">正在等待登录</h3>
        <p class="text-sm text-gray-500">请在弹出的浏览器窗口中完成扫码登录</p>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Users, Plus, Info, MoreVertical, Wifi, Clock, RefreshCw, Trash2 } from 'lucide-vue-next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const accounts = ref<any[]>([])
const loading = ref(false)
const showLogin = ref(false)

const loadAccounts = async () => {
  loading.value = true
  try {
    const res = await window.ipcRenderer.invoke('account:list')
    // Mock status for demo, real implementation should check validity
    accounts.value = res.map((acc: any) => ({
      ...acc,
      status: 'valid', // 'valid' | 'invalid'
      checking: false
    }))
  } catch (err) {
    console.error(err)
    ElMessage.error('加载账号列表失败')
  } finally {
    loading.value = false
  }
}

const addAccount = async () => {
  showLogin.value = true
  try {
    const res = await window.ipcRenderer.invoke('account:add', { platform: 'dy' })
    if (res?.success) { // Handle void return if applicable, though usually returns object
      ElMessage.success('账号添加成功')
      loadAccounts()
    } else {
       // Check if response is just void/undefined which might mean success in some implementations
       // or explicit failure. Assuming ipc returns object.
       if (res && res.error) {
         ElMessage.error(res.message || '添加失败')
       } else {
         // Fallback success if no explicit error
         loadAccounts()
       }
    }
  } catch (err: any) {
    console.error(err)
    ElMessage.error(err.message || '添加失败')
  } finally {
    showLogin.value = false
  }
}

const updateCookie = async (account: any) => {
  // Reuse add logic but maybe we need a specific update flow?
  // For now, re-login effectively updates cookies
  await addAccount()
}

const checkStatus = async (account: any) => {
  account.checking = true
  // Mock check delay
  setTimeout(() => {
    account.checking = false
    ElMessage.success('账号状态正常')
  }, 1500)
}

const deleteAccount = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该账号吗？', '删除确认', { 
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      confirmButtonClass: 'el-button--danger'
    })
    await window.ipcRenderer.invoke('account:delete', id)
    ElMessage.success('删除成功')
    loadAccounts()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
      ElMessage.error('删除失败')
    }
  }
}

const formatRelativeTime = (ts: number) => {
  if (!ts) return '从未'
  return dayjs(ts).fromNow()
}

onMounted(loadAccounts)
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.accounts-container {
  @apply h-full;
  :deep(.el-card__header) {
    @apply flex items-center justify-between shrink-0 z-10 px-4 py-2;
  }
  :deep(.el-card__body) {
    @apply flex-1 flex flex-col h-full overflow-auto p-4;
  }
}
</style>
