<template>
  <el-dialog :model-value="modelValue" title="新增/选择评论提取关键字" width="600px" @update:model-value="emit('update:modelValue', $event)">
    <div class="filter-keywords-dialog">
      <div class="add-row">
        <el-input v-model="newFilterKeyword" placeholder="输入关键词，例如 '多少钱', '怎么买' (支持逗号/空格批量添加，回车新增)" clearable @keydown.enter.prevent="addNewFilterKeyword" />
        <el-button type="primary" @click="addNewFilterKeyword">新增</el-button>
      </div>
      <div class="library-tags">
        <el-tag
          v-for="k in savedFilterKeywords"
          :key="k"
          :type="isSelectedKeyword(k) ? 'success' : 'info'"
          closable
          class="lib-tag"
          @click="toggleSelectKeyword(k)"
          @close="deleteLibraryKeyword(k)"
        >
          {{ k }}
        </el-tag>
        <div v-if="savedFilterKeywords.length === 0" class="no-library">暂无本地关键词，先新增一个吧</div>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer justify-center flex">
        <el-button @click="emit('update:modelValue', false)">取消</el-button>
        <el-button type="primary" @click="confirmFilterKeywords">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  initialSelected: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'confirm', keywords: string[]): void
}>()

const savedFilterKeywords = ref<string[]>([])
const selectedFilterKeywords = ref<string[]>([])
const newFilterKeyword = ref('')


const FILTER_KEYWORDS_STORAGE_KEY = 'savedFilterKeywords'

const loadSavedFilterKeywords = () => {
  try {
    const raw = localStorage.getItem(FILTER_KEYWORDS_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : props.initialSelected || []
    savedFilterKeywords.value = Array.isArray(list) ? list : []
  } catch {
    savedFilterKeywords.value = []
  }
}

const saveSavedFilterKeywords = () => {
  localStorage.setItem(FILTER_KEYWORDS_STORAGE_KEY, JSON.stringify(savedFilterKeywords.value))
}

watch(() => props.modelValue, (val) => {
  if (val) {
    loadSavedFilterKeywords()
    selectedFilterKeywords.value = [...props.initialSelected]
    newFilterKeyword.value = ''
  }
})

const addNewFilterKeyword = () => {
  const val = (newFilterKeyword.value || '').trim()
  if (!val) return

  const keywords = val.split(/[,，、\n\s]/).map(k => k.trim()).filter(k => k)
  
  if (keywords.length === 0) return

  let hasNew = false
  keywords.forEach(keyword => {
    if (!savedFilterKeywords.value.includes(keyword)) {
      savedFilterKeywords.value.push(keyword)
      hasNew = true
    }
    if (!selectedFilterKeywords.value.includes(keyword)) {
      selectedFilterKeywords.value.push(keyword)
    }
  })

  if (hasNew) {
    saveSavedFilterKeywords()
  }

  newFilterKeyword.value = ''
}

const toggleSelectKeyword = (keyword: string) => {
  const idx = selectedFilterKeywords.value.indexOf(keyword)
  if (idx >= 0) {
    selectedFilterKeywords.value.splice(idx, 1)
  } else {
    selectedFilterKeywords.value.push(keyword)
  }
}

const isSelectedKeyword = (keyword: string) => selectedFilterKeywords.value.includes(keyword)

const confirmFilterKeywords = () => {
  emit('confirm', [...selectedFilterKeywords.value])
  emit('update:modelValue', false)
}

const deleteLibraryKeyword = (keyword: string) => {
  const i = savedFilterKeywords.value.indexOf(keyword)
  if (i >= 0) {
    savedFilterKeywords.value.splice(i, 1)
    saveSavedFilterKeywords()
  }
  const si = selectedFilterKeywords.value.indexOf(keyword)
  if (si >= 0) {
    selectedFilterKeywords.value.splice(si, 1)
  }
}
</script>

<style scoped lang="scss">
.filter-keywords-dialog {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .add-row {
    display: flex;
    gap: 10px;
  }

  .library-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .lib-tag {
    cursor: pointer;
  }

  .no-library {
    color: #9e9e9e;
  }
}
</style>
