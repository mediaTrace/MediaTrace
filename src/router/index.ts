import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/tasks', name: 'tasks', component: () => import('../views/TasksView.vue') },
    { path: '/tasks/new', name: 'task-new', component: () => import('../views/NewTask/index.vue') },
    { path: '/data', name: 'data', component: () => import('../views/DataView/index.vue') },
    { path: '/accounts', name: 'accounts', component: () => import('../views/AccountsView.vue') },
    { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue') },
  ]
})

export default router
