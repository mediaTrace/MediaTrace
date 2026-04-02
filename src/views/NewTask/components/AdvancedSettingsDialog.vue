<template>
  <el-dialog :model-value="modelValue" title="采集参数设置" width="520px" @update:model-value="emit('update:modelValue', $event)">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="text-sm">是否开启爬评论模式</div>
        <el-switch v-model="config.enableCommentCrawl" />
      </div>
      <div class="flex items-center justify-between">
        <div class="text-sm">是否开启二级评论模式</div>
        <el-switch v-model="config.enableSecondLevel" />
      </div>
      <div class="flex items-center justify-between">
        <div class="text-sm">采集视频/帖子数量</div>
        <el-input-number v-model="config.collectCount" :min="1" />
      </div>
      <div class="flex items-center justify-between">
        <div class="text-sm">是否采集作者信息</div>
        <el-switch v-model="config.collectAuthorInfo" />
      </div>
      <div class="flex items-center justify-between">
        <div class="text-sm">采集一级评论数量</div>
        <el-input-number v-model="config.commentCount" :min="1" />
      </div>
      <div class="flex items-center justify-between">
        <div class="text-sm">采集间隔时间(秒)</div>
        <el-input-number v-model="config.intervalSec" :min="1" />
      </div>
      <div class="flex items-center justify-between">
        <div class="text-sm">是否开启评论过滤</div>
        <el-switch v-model="config.enableCommentFilter" />
      </div>
      <div>
        <div class="text-sm mb-2">清理缓存</div>
        <el-button type="danger" plain @click="emit('clear-cache')">清除缓存</el-button>
      </div>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { AdvancedConfig } from '../types'

const props = defineProps<{
  modelValue: boolean
  config: AdvancedConfig
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'update:config', val: AdvancedConfig): void
  (e: 'clear-cache'): void
}>()

// Since config is a reactive object passed by reference, v-model works directly on it if it's a prop object.
// But it's better practice to emit updates if we want to be strict.
// However, Element Plus components modify the model directly usually.
// Given the simplicity, we rely on the parent passing a reactive object.
</script>
