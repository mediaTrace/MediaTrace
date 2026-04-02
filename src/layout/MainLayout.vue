<template>
  <div class="common-layout">
    <el-container class="h-screen">
      <el-aside width="200px" class="aside-menu">
        <div class="logo drag-region">
          MediaTracer
        </div>
        <el-menu
          router
          :default-active="$route.path"
          class="el-menu-vertical"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409eff"
        >
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <el-icon><List /></el-icon>
            <span>任务管理</span>
          </el-menu-item>
          <el-menu-item index="/data">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据中心</span>
          </el-menu-item>
          <el-menu-item index="/accounts">
            <el-icon><User /></el-icon>
            <span>账号管理</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header height="40px" class="app-header drag-region">
          <div class="header-title">MediaTracer‌</div>
          <div class="window-controls no-drag">
            <div class="control-btn" @click="minimize"><el-icon><Minus /></el-icon></div>
            <div class="control-btn" @click="maximize">
              <el-icon v-if="isMaximized"><CopyDocument /></el-icon>
              <el-icon v-else><FullScreen /></el-icon>
            </div>
            <div class="control-btn close" @click="close"><el-icon><Close /></el-icon></div>
          </div>
        </el-header>
        <el-main class="app-main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

console.log('[MainLayout] Setup executed')
const isMaximized = ref(false)

// Main Layout Logic
const minimize = () => window.ipcRenderer.invoke('window-minimize')
const maximize = () => window.ipcRenderer.invoke('window-maximize')
const close = () => window.ipcRenderer.invoke('window-close')

onMounted(async () => {
  console.log('MainLayout mounted')
  try {
    isMaximized.value = await window.ipcRenderer.invoke('window-is-maximized')
    console.log('Initial maximized state:', isMaximized.value)
  } catch (error) {
    console.error('Failed to get initial maximized state:', error)
  }
  
  window.ipcRenderer.on('window-maximized-state', (_event, state) => {
    console.log('window-maximized-state received:', state)
    isMaximized.value = state
  })
})
</script>

<style scoped>
.h-screen {
  height: 100vh;
}
.aside-menu {
  background-color: #304156;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
  background-color: #2b3a4d;
}
.el-menu-vertical {
  border-right: none;
  flex: 1;
}
.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  user-select: none;
}
.header-title {
  font-size: 14px;
  color: #666;
}
.window-controls {
  display: flex;
  gap: 8px;
}
.control-btn {
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}
.control-btn:hover {
  background-color: #f0f0f0;
}
.control-btn.close:hover {
  background-color: #f56c6c;
  color: white;
}
.app-main {
  background-color: #f0f2f5;
  padding: 20px;
}
.drag-region {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}
</style>
