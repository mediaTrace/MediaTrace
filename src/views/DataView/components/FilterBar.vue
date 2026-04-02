<template>
  <div class="header bg-white shadow-sm space-y-4 border-b-[1px] border-gray-100">
    <!-- Title & Actions -->
    <div class="flex justify-between items-center px-4 py-2 border-b-[1px] border-gray-100 max-sm:flex-col max-sm:items-start max-sm:gap-2">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-green-50 text-green-600 rounded-lg">
          <Database :size="24" />
        </div>
        <div>
          <div class="text-lg font-bold">数据中心</div>
          <p class="text-xs text-gray-500">管理与导出采集到的数据</p>
        </div>
      </div>
      <div class="flex gap-2">
        <el-button plain :disabled="selectedCount === 0" @click="$emit('delete')">
          <Trash2 :size="14" class="mr-1.5" /> 删除选中 ({{ selectedCount }})
        </el-button>
        <el-button type="success" plain @click="$emit('export')">
          <FileSpreadsheet :size="14" class="mr-1.5" /> 导出 Excel
        </el-button>
      </div>
    </div>
    
    <div class="flex flex-col pb-4 2xl:flex-row 2xl:justify-between">
      <!-- Filters -->
      <div class="flex items-center gap-6 text-sm px-4 flex-1 max-2xl:mb-4 max-lg:flex-col max-lg:items-start max-lg:gap-4">
        <!-- Platform Filter -->
        <div class="flex items-center gap-2">
          <Layers :size="14" class="text-gray-400" />
          <span class="text-gray-500">平台</span>
          <div class="flex bg-gray-100 rounded-lg p-1">
            <div 
              v-for="p in socialMediaOptions" :key="p.id"
              class="px-3 py-1 rounded-md cursor-pointer transition-all text-xs"
              :class="[
                p.disabled ? 'text-gray-300 cursor-not-allowed' : '',
                filter.platform === p.id ? 'bg-white text-[var(--el-color-primary)] shadow-sm font-medium' : (p.disabled ? '' : 'text-gray-500 hover:text-gray-700')
              ]"
              @click="!p.disabled && handlePlatformChange(p.id)"
            >{{ p.name }}</div>
          </div>
        </div>

        <!-- Data Type Filter -->
        <div class="flex items-center gap-2">
          <Files :size="14" class="text-gray-400" />
          <span class="text-gray-500">类型</span>
          <div class="flex bg-gray-100 rounded-lg p-1">
            <div 
              v-for="t in categoryOptions" :key="t.id"
              class="px-3 py-1 rounded-md cursor-pointer transition-all text-xs flex items-center gap-1.5"
              :class="filter.type === t.id ? 'bg-white text-[var(--el-color-primary)] shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'"
              @click="handleTypeChange(t.id)"
            >
              <component :is="getCategoryIcon(t.id)" :size="12" />
              {{ t.name }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Search Bar -->
      <div class="flex gap-3 px-4 flex-1">
        <el-input 
          v-model="filter.keyword" 
          placeholder="搜索昵称、内容关键词或 ID..." 
          prefix-icon="Search"
          class="flex-1 py-0"
          clearable
          @keyup.enter="$emit('search')"
        />
        <el-date-picker
          v-if="filter.type !== 'creator'"
          v-model="filter.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!flex-1"
        />
        <el-button type="primary" @click="$emit('search')">
          <Filter :size="14" class="mr-1.5" /> 查询
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  Database, Trash2, FileSpreadsheet, Layers, Files, 
  Filter, MessageSquare, Video, Users 
} from 'lucide-vue-next'
import { socialMediaOptions, categoryOptions } from '../config'

const props = defineProps<{
  filter: {
    platform: string;
    type: string;
    keyword: string;
    dateRange: any[];
  };
  selectedCount: number;
}>()

const emit = defineEmits<{
  (e: 'update:filter', value: any): void;
  (e: 'search'): void;
  (e: 'export'): void;
  (e: 'delete'): void;
}>()

const getCategoryIcon = (typeId: string) => {
  if (typeId === 'comment') return MessageSquare
  if (typeId === 'video') return Video
  if (typeId === 'creator') return Users
  return Files
}

const handlePlatformChange = (platformId: string) => {
  props.filter.platform = platformId
  // Optionally auto-search after changing tab
  setTimeout(() => emit('search'), 0)
}

const handleTypeChange = (typeId: string) => {
  props.filter.type = typeId
  // Optionally auto-search after changing tab
  setTimeout(() => emit('search'), 0)
}
</script>
