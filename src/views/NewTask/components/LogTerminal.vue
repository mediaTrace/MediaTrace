<template>
  <!-- <div class="rounded-2xl border border-[#2b2f36] bg-[#111320]">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[#1e2228]">
      <div class="text-sm">任务执行终端</div>
      <div class="text-xs text-green-400">已完成</div>
    </div>
    <div class="h-40 overflow-auto px-4 py-3 text-xs text-slate-300">
      <div v-for="line in logs" :key="line" class="mb-2">
        {{ line }}
      </div>
    </div>
  </div> -->
  <el-card class="task-log-card !rounded-lg flex flex-col h-full overflow-hidden">
    <template #header>
      <div class="flex items-center gap-2">
        <Terminal :size="18" class="dark:text-emerald-400" />
        <h2 class="text-base">任务执行终端</h2>
        <el-tag :type="props.processState.isRunning ? 'warning' : (props.processState.exitCode === 0 ? 'success' : 'danger')" class="!rounded-full px-2.5 ml-2 mr-2" size="default">
          <Activity v-if="props.processState.isRunning" :size="12" class="animate-pulse" />
          <PauseCircle v-else :size="14" />
          {{ props.processState.isRunning ? '运行中' : (props.processState.exitCode === 0 ? '已完成' : '异常结束') }}
        </el-tag>
      </div>
      <div class="flex items-center gap-4">
        <el-button
          v-if="props.processState.isRunning"
          size="default"
          class="!rounded-full"
          @click="emit('terminateTask')"
        >
          <X :size="14" class="mr-1" />
          终止任务
        </el-button>
        <div
          class="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          title="清除日志"
          @click="emit('clear')"
        >
          <Eraser :size="20" />
        </div>
      </div>
    </template>
    <div ref="scrollRef" class="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs md:text-sm bg-slate-950">
      <div v-if="props.processState.logs.length === 0" class="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
        <PlayCircle :size="48" :stroke-width="1" />
        <p class="ml-2">等待任务启动...</p>
      </div>
      <div v-else>
        <div v-for="log in props.processState.logs" :key="log.timestamp" class="flex gap-3 hover:bg-slate-900/50 p-0.5 rounded leading-relaxed text-[var(--el-color-info)]">
          <span class="break-all">{{ log }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Terminal, Activity, Eraser, PlayCircle, PauseCircle, X } from 'lucide-vue-next'

const props = defineProps<{
  processState: any
}>()

const emit = defineEmits<{
  (e: 'clear'): void
  (e: 'terminateTask'): void
}>()

const scrollRef = ref<HTMLElement | null>(null)

watch(
  () => props.processState.logs,
  () => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  },
  { deep: true }
)

</script>

<style scoped lang="scss">
@reference "tailwindcss";
.task-log-card {
  :deep(.el-card__header) {
    @apply flex items-center justify-between shrink-0 z-10 px-4 py-2;
  }
  :deep(.el-card__body) {
    padding: 0;
    @apply flex flex-col h-full overflow-hidden;
  }
  :deep(.el-tag__content) {
    @apply flex items-center gap-1.5 text-xs font-medium;
  }
}
</style>
