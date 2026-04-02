<template>
  <div class="data-view-container h-full flex flex-col rounded-sm shadow-2xl bg-white overflow-hidden">
    <!-- Filter Bar Component -->
    <FilterBar 
      v-model:filter="filter"
      :selectedCount="selectedItems.length"
      @search="handleSearch"
      @export="handleExport"
      @delete="handleBatchDelete"
    />

    <!-- Result Table Component -->
    <ResultTable 
      :data="items"
      :loading="loading"
      :total="total"
      v-model:page="page"
      :pageSize="pageSize"
      :dataTypeKey="currentDataType"
      :selectedCount="selectedItems.length"
      @selection-change="handleSelectionChange"
      @update:page-size="handlePageSizeChange"
      @page-change="loadData"
      @sort-change="handleSortChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FilterBar from './components/FilterBar.vue'
import ResultTable from './components/ResultTable.vue'
import { availableTables } from './config'

// State
const loading = ref(false)
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const selectedItems = ref<any[]>([])
const currentSort = ref<{ prop: string, order: string | null }>({ prop: 'add_ts', order: 'descending' })

// Filters
const filter = ref({
  platform: 'douyin',
  type: 'comment',
  keyword: '',
  dateRange: [] as any[]
})

// Computed table mapping keys
const currentDataType = computed(() => {
  return `${filter.value.platform}_${filter.value.type}`
})

// Computed Table Name based on filters and available tables
const currentTableName = computed(() => {
  const dt = currentDataType.value
  // Map our internal dataType to actual database table name
  const tableMap: Record<string, string> = {
    'douyin_video': 'douyin_aweme',
    'douyin_comment': 'douyin_aweme_comment',
    'douyin_creator': 'dy_creator',
    'xhs_video': 'xhs_note',
    'xhs_comment': 'xhs_note_comment',
    'xhs_creator': 'xhs_creator'
  }
  
  const mappedName = tableMap[dt]
  // Fallback to the first available if not mapped
  return mappedName || availableTables[0]?.id || 'douyin_aweme_comment'
})

// Methods
const handleSearch = () => {
  page.value = 1
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    let searchFields: string[] = []
    if (filter.value.type === 'comment') {
      searchFields = ['content']
    } else if (filter.value.type === 'video') {
      searchFields = ['title', 'desc']
    } else if (filter.value.type === 'creator') {
      searchFields = ['nickname', 'phone', 'desc']
    }

    const res = await window.ipcRenderer.invoke('data:query', {
        table: currentTableName.value,
        page: page.value,
        pageSize: pageSize.value,
        keyword: filter.value.keyword,
        searchFields,
        startDate: filter.value.dateRange?.[0] ? new Date(filter.value.dateRange[0]).getTime() : undefined,
        endDate: filter.value.dateRange?.[1] ? new Date(filter.value.dateRange[1]).getTime() : undefined,
        sortProp: currentSort.value.order ? currentSort.value.prop : 'add_ts',
        sortOrder: currentSort.value.order === 'ascending' ? 'ASC' : 'DESC'
      })
    items.value = res.items || []
    total.value = res.total || 0
  } catch (err) {
    console.error(err)
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleSelectionChange = (val: any[]) => {
  selectedItems.value = val
}

const handleSortChange = ({ prop, order }: { prop: string, order: string | null }) => {
  currentSort.value = { prop, order }
  page.value = 1
  loadData()
}

const handlePageSizeChange = (val: number) => {
  pageSize.value = val
  page.value = 1
  loadData()
}

const handleBatchDelete = async () => {
  if (selectedItems.value.length === 0) return
  
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedItems.value.length} 条数据吗？`, '批量删除', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger'
    })
    
    loading.value = true
    const ids = selectedItems.value.map(item => item.id)
    await window.ipcRenderer.invoke('data:delete', {
      table: currentTableName.value,
      ids
    })
    
    ElMessage.success('删除成功')
    loadData()
  } catch (err) {
    if (err !== 'cancel') {
      console.error(err)
      ElMessage.error('删除失败')
    }
  } finally {
    loading.value = false
  }
}

const handleExport = async () => {
  try {
    const ids = selectedItems.value.length > 0 ? selectedItems.value.map(item => item.id) : undefined
    
    const res = await window.ipcRenderer.invoke('data:export', {
      table: currentTableName.value,
      ids
    })
    
    if (res.success) {
      ElMessage.success(`导出成功：${res.filePath}`)
      loadData()
    } else if (res.message) {
      ElMessage.info(res.message)
    }
  } catch (err: any) {
    console.error(err)
    ElMessage.error(err.message || '导出失败')
  }
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
/* Scoped styles if needed */
</style>
