<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
const props = defineProps({
  name: {
    type: String,
    default: 'douyin'
  },
  size: {
    type: String,
    default: '16px'
  },
  color: {
    type: String,
    default: ''
  },
  class: {
    type: String,
    default: ''
  },
})

const iconName = computed(() => {
  return props.name
})

const iconModule = ref(null)

const loadIcon = async () => {
  try {
    // 使用Vite的动态导入功能
    iconModule.value = await import(`../assets/icons/${iconName.value}.svg`)
  } catch (error) {
    console.error(`无法加载图标: ${iconName.value}`, error)
  }
}

// 监听iconName变化，重新加载图标
watchEffect(() => {
  loadIcon()
})

const iconUrl = computed(() => {
  return (iconModule.value as any)?.default
})
</script>

<template>
  <img 
    v-if="iconUrl" 
    :src="iconUrl" 
    :alt="iconName" 
    :style="{ width: size, height: size, color: color }"
    :class="$attrs.class"
  />
  <div v-else class="icon-placeholder" :style="{ width: size, height: size }"></div>
</template>

<style scoped>
.icon-placeholder {
  display: inline-block;
  background-color: #f0f0f0;
  border-radius: 4px;
}
</style>
