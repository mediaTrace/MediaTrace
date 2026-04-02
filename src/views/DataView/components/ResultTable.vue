<template>
  <div class="flex-1 bg-white shadow-sm overflow-hidden flex flex-col">
    <el-table 
      :data="data" 
      v-loading="loading" 
      style="width: 100%" 
      height="100%"
      border
      stripe
      header-cell-class-name="!bg-gray-50 !text-gray-600 !font-medium"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column type="selection" width="50" align="center" fixed="left" />
      <!-- User / Avatar / Nickname / Basic Info Column (often used for many types) -->
      <el-table-column v-if="columns.includes('nickname')" label="用户" min-width="200" fixed="left">
        <template #default="{ row }">
          <div class="flex items-center gap-3 leading-none">
            <div class="relative shrink-0">
              <el-avatar :size="36" :src="row.avatar" class="border border-gray-100" />
              <!-- <div 
                class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white text-[8px] text-white font-bold"
                :class="getPlatformColor(row)"
              >
                {{ getPlatformLabel(row) }}
              </div> -->
            </div>
            <div class="flex flex-col min-w-0">
              <div class="font-bold text-gray-800 text-sm truncate flex items-center gap-2">
                {{ row.nickname || '匿名用户' }}
                <!-- <span class="px-1.5 py-0.5 bg-red-50 text-red-500 rounded text-[10px] border border-red-100" v-if="getPlatformLabel(row) === '红'">RED</span>
                <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200" v-else>DY</span> -->
              </div>
              <!-- <div class="text-xs text-gray-400 font-mono truncate">
                ID: {{ row.short_user_id || row.user_id || row.user_unique_id || row.sec_uid?.substring(0, 8) || row.red_id || '-' }}
              </div> -->
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Dynamic Columns based on tableDataKey -->
      <template v-for="col in columns" :key="col">
        <!-- Skip nickname as it's already rendered as the main fixed column -->
        <template v-if="col !== 'nickname'">
          
          <!-- Content / Title / Desc Column -->
          <el-table-column 
            v-if="col === 'content' || col === 'title' || col === 'desc'" 
            :label="fieldNameMap[col] || col" 
            min-width="250" 
            show-overflow-tooltip
          >
            <template #default="{ row }">
              <div v-if="col === 'content'" class="text-sm text-gray-700">{{ row.content }}</div>
              <div v-else-if="col === 'title'" class="font-medium text-gray-800">{{ row.title }}</div>
              <div v-else-if="col === 'desc'" class="text-sm text-gray-500 italic">{{ row.desc || row.user_signature || '无简介' }}</div>
            </template>
          </el-table-column>

          <!-- Status Columns -->
          <el-table-column 
            v-else-if="col === 'is_exported' || col === 'is_crm'" 
            :label="fieldNameMap[col] || col" 
            :width="tableColumnWidth[col] || '100px'" 
            align="center"
            :sortable="col === 'is_exported' ? 'custom' : false"
            :sort-orders="['descending', 'ascending', null]"
          >
            <template #default="{ row }">
              <div v-if="col === 'is_crm'" class="flex justify-center">
                <span 
                  class="px-2 py-1 rounded-full text-xs border flex items-center gap-1"
                  :class="row.is_crm ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'"
                >
                  <DatabaseZap :size="10" />
                  {{ row.is_crm ? '已入库' : '未入库' }}
                </span>
              </div>
              <div v-else-if="col === 'is_exported'" class="flex justify-center">
                <span 
                  class="text-xs"
                  :class="row.is_exported ? 'text-emerald-500' : 'text-gray-400'"
                >
                  {{ row.is_exported ? '已导出' : '未导出' }}
                </span>
              </div>
            </template>
          </el-table-column>

          <!-- Date Columns -->
          <el-table-column 
            v-else-if="col === 'create_time' || col === 'add_ts' || col === 'time'" 
            :prop="col"
            :label="fieldNameMap[col] || col" 
            :width="tableColumnWidth[col] || '160px'"
            :sortable="true ? 'custom' : false"
            :sort-orders="['descending', 'ascending', null]"
          >
            <template #default="{ row }">
              <div class="flex flex-col text-xs">
                <span class="text-gray-700">{{ formatDateTime(row[col])?.split(' ')[0] || '-' }}</span>
                <span class="text-gray-400">{{ formatDateTime(row[col])?.split(' ')[1] || '' }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- Default Column -->
          <el-table-column 
            v-else 
            :prop="col" 
            :label="fieldNameMap[col] || col" 
            :width="tableColumnWidth[col]"
            :min-width="tableColumnWidth[col] ? undefined : '120px'"
            show-overflow-tooltip
            :sortable="col === 'phone' || col === 'last_modify_ts' ? 'custom' : false"
            :sort-orders="['descending', 'ascending', null]"
          >
            <template #default="{ row }">
              <span class="text-gray-600 text-sm">{{ row[col] ?? '-' }}</span>
            </template>
          </el-table-column>
          
        </template>
      </template>

      <!-- Actions -->
      <!-- <el-table-column label="操作" width="80" align="center" fixed="right">
        <template #default>
          <el-button link type="info">
            <MoreHorizontal :size="16" />
          </el-button>
        </template>
      </el-table-column> -->
    </el-table>
    
    <!-- Footer Pagination -->
    <div class="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
      <div class="text-xs text-gray-500">
        总计 <span class="font-bold text-gray-800">{{ total }}</span> 条记录，已选 <span class="font-bold text-[var(--el-color-primary)]">{{ selectedCount }}</span> 条
      </div>
      <el-pagination 
        background 
        layout="sizes, prev, pager, next, jumper" 
        :total="total" 
        :current-page="page"
        :page-size="pageSize"
        :page-sizes="[20, 30, 50, 100, 300, 500]"
        @update:current-page="(val: number) => $emit('update:page', val)"
        @update:page-size="(val: number) => $emit('update:page-size', val)"
        @current-change="$emit('page-change')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DatabaseZap, MoreHorizontal } from 'lucide-vue-next'
import dayjs from 'dayjs'
import { fieldNameMap, tableColumnWidth, tableDataKey } from '../config'

const props = defineProps<{
  data: any[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  dataTypeKey: string; // e.g., 'douyin_video', 'xhs_comment'
  selectedCount: number;
}>()

const emit = defineEmits<{
  (e: 'selection-change', val: any[]): void;
  (e: 'update:page', val: number): void;
  (e: 'update:page-size', val: number): void;
  (e: 'page-change'): void;
  (e: 'sort-change', val: { prop: string, order: string | null }): void;
}>()

const columns = computed(() => {
  return tableDataKey[props.dataTypeKey] || []
})

const handleSelectionChange = (val: any[]) => {
  emit('selection-change', val)
}

const handleSortChange = ({ prop, order }: { prop: string, order: string | null }) => {
  emit('sort-change', { prop, order })
}

const formatDateTime = (ts: number | string) => {
  if (!ts) return null
  // Some timestamps might be in seconds, some in milliseconds
  // Generally JS timestamps are 13 digits.
  let time = ts;
  if (typeof time === 'number' && time.toString().length === 10) {
    time = time * 1000
  }
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const getPlatformLabel = (row: any) => {
  if (props.dataTypeKey.startsWith('xhs')) return '红'
  return '抖'
}

const getPlatformColor = (row: any) => {
  if (props.dataTypeKey.startsWith('xhs')) return 'bg-red-500'
  return 'bg-black'
}
</script>
