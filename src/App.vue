<template>
  <AppLayout />
</template>

<script setup lang="ts">
import AppLayout from './AppLayout.vue'
</script>

<style>
/* body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
} */

/* 全局样式 */
:root {
  --bg-color: #f5f5f5;
  --text-color: #333;
  --border-color: #e0e0e0;
  --hover-color: #dadada;
  --active-color: #e6f7ff;
  --sidebar-bg: #f5f5f5;
  --header-bg: white;
  --popup-bg: white;
  --secondary-text: #666;
}

/* 暗黑模式变量 */
.dark-mode {
  --bg-color: #1a1a1a;
  --text-color: #f5f5f5;
  --border-color: #333;
  --hover-color: #333;
  --active-color: #333;
  --sidebar-bg: #2e3238;
  --header-bg: #262626;
  --popup-bg: #2c2c2c;
  --secondary-text: #aaa;
}
/* 全局自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background-color: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: #90a4ae;
}
</style>
