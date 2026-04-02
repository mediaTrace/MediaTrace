<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { InputInstance, ElMessage } from 'element-plus'

const props = defineProps({
  // 标签数组
  tags: {
    type: Array as () => string[],
    default: () => []
  },
  // 按钮文本
  buttonText: {
    type: String,
    default: '+ 新增标签'
  },
  // 输入框占位符
  placeholder: {
    type: String,
    default: '请输入标签'
  },
  // 标签大小
  tagSize: {
    type: String,
    default: 'large'
  },
  // 输入框/按钮大小
  inputSize: {
    type: String,
    default: 'default'
  },
  // 标签类型
  type: {
    type: String,
    default: 'info'
  },
  // 任务类型
  taskType: {
    type: String,
    default: 'search' // 搜索：search, 评论：comment, 详情：detail, 主页：creator
  },
  // 最大标签数量
  maxTags: {
    type: Number,
    default: 0 // 0表示不限制
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: true
  },
  // 平台
  platform: {
    type: String,
    default: 'dy'
  },
  // 是否过滤
  isFilter: {
    type: Boolean,
    default: false
  },
  openModalOnAdd: {
    type: Boolean,
    default: false
  },
  disableTransitions: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:tags', 'open-add'])

const inputValue = ref('')
const inputVisible = ref(false)
const InputRef = ref<InputInstance>()

// 关闭标签
const handleClose = (tag: string) => {
  const newTags = [...props.tags]
  newTags.splice(newTags.indexOf(tag), 1)
  emit('update:tags', newTags)
}

// 显示输入框
const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    // 使用组件提供的 focus 方法，避免直接访问内部 input
    InputRef.value?.focus?.()
  })
}

const handleAddClick = () => {
  if (props.openModalOnAdd) {
    emit('open-add')
    return
  }
  showInput()
}

// 添加标签到列表的公共函数
const addTagToTags = () => {
  // 检查是否达到最大标签数量限制
  if (props.maxTags > 0 && props.tags.length >= props.maxTags) {
    ElMessage.warning(`最多只能添加${props.maxTags}个标签`)
    inputVisible.value = false
    inputValue.value = ''
    return
  }
  
  const newTags = [...props.tags, inputValue.value]
  emit('update:tags', newTags)
  inputVisible.value = false
  inputValue.value = ''
}

import { extractDouyinVideoId, extractDouyinUserId } from '@/utils/taskType'
// 确认输入
const handleInputConfirm = () => {
  // 为空时忽略
  if (!inputValue.value) {
    inputVisible.value = false
    inputValue.value = ''
    return
  }

  switch (props.taskType) {
    case 'comment':
      // 评论关键词 - 检查特殊字符
      const specialCharRegex = /[,，]/
      if (specialCharRegex.test(inputValue.value)) {
        ElMessage.warning('关键词不能包含特殊字符（逗号）')
      } else {
        addTagToTags()
      }
      break

    case 'search':
      // 搜索关键词 - 直接添加
      addTagToTags()
      break

    case 'detail':
      // 视频详情 - 验证视频URL
      const videoId = extractDouyinVideoId(props.platform, inputValue.value)
      console.log(videoId)
      if (!videoId) {
        ElMessage.warning('请输入正确的视频URL')
        return
      }
      addTagToTags()
      break

    case 'creator':
      // 用户主页 - 验证用户主页URL
      const userId = extractDouyinUserId(props.platform, inputValue.value)
      console.log(userId)
      if (!userId) {
        ElMessage.warning('请输入正确的用户主页URL')
        return
      }
      addTagToTags()
      break

    default:
      // 默认情况直接添加
      addTagToTags()
      break
  }
}

// 避免 ElementPlus 在 blur 生命周期内访问已卸载节点导致 parentNode 报错
const handleBlur = () => {
  setTimeout(() => {
    handleInputConfirm()
  }, 0)
}

const handleClick = (tag: string) => {
  // 复制标签文本到剪贴板
  navigator.clipboard.writeText(tag)
  ElMessage.success('标签内容已复制到剪贴板')
}

// 标签输入框ID提取逻辑
// const getInputId = (url) => {}
</script>

<template>
  <div class="tag-input-container">
    <div class="flex gap-2">
      <el-tag
        v-for="tag in tags"
        :key="tag"
        :size="tagSize"
        :type="type"
        :title="tag"
        :disabled="disabled"
        :disable-transitions="disableTransitions"
        closable
        @close="handleClose(tag)"
        @click.stop="handleClick(tag)"
      >
        {{ tag }}
      </el-tag>
      <el-input
        v-if="inputVisible"
        ref="InputRef"
        v-model="inputValue"
        class="w-20"
        :size="inputSize"
        :placeholder="placeholder"
        :clearable="true"
        @keydown.enter.prevent="handleInputConfirm"
        @blur="handleBlur"
      />
      <el-button v-else class="button-new-tag" :size="inputSize" :disabled="maxTags > 0 && tags.length >= maxTags" :title="maxTags > 0 && tags.length >= maxTags ? `最多只能添加${maxTags}个标签` : ''" @click="handleAddClick">
        {{ buttonText }}
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.gap-2 {
  gap: 0.5rem;
}

.flex {
  display: flex;
  flex-wrap: wrap;
}

.el-tag--large {
  font-size: 14px;
}

:deep(.el-tag__content) {
  max-width: 345px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
