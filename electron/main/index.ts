import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const require = createRequire(import.meta.url)

process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const appIcon = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT || '', 'build', 'logo.ico')
  : path.join(process.resourcesPath, 'build', 'logo.ico')

function createWindow() {
  win = new BrowserWindow({
    title: 'MediaTrace',
    icon: appIcon,
    width: 1200,
    height: 800,
    frame: false, // 无边框，自定义标题栏
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('maximize', () => {
    console.log('window-maximized')
    win?.webContents.send('window-maximized-state', true)
  })
  win.on('unmaximize', () => {
    console.log('window-unmaximized')
    win?.webContents.send('window-maximized-state', false)
  })
}

import { setupIpc } from './ipc'

app.whenReady().then(async () => {
  await setupIpc()
  createWindow()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// 窗口控制 IPC
ipcMain.handle('window-minimize', () => {
  win?.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (win?.isMaximized()) {
    win?.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.handle('window-is-maximized', () => {
  return win?.isMaximized()
})

ipcMain.handle('window-close', () => {
  win?.close()
})
