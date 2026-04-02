<template>
  <div class="flex w-full justify-between items-center max-sm:flex-col max-sm:items-start max-sm:gap-2">
    <div class="flex items-center gap-3">
      <div class="p-2 bg-indigo-50 rounded-lg">
        <Settings2 :size=24 />
      </div>
      <div>
        <div class="text-lg font-bold">新建任务</div>
        <p class="text-xs opacity-80">配置目标平台与采集参数</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <el-button type="primary" @click="emit('toggle-simple-mode')">
        <component :is="simpleMode ? PanelTopOpen : PanelTopClose" :size=14 class="mr-1" /> {{  simpleMode ? '专业模式' : '简洁模式'}}
      </el-button>
      <el-button @click="emit('open-advanced')">
        <Sliders :size=14 class="mr-1" />高级设置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Settings2, PanelTopOpen, PanelTopClose, Sliders } from 'lucide-vue-next'
defineProps<{
  simpleMode: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-simple-mode'): void
  (e: 'open-advanced'): void
}>()
</script>
