import { ipcMain, app, BrowserWindow, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { chromium } from 'playwright'
import { openSqlite, initSqliteSchema, type SqliteDb } from './storage/db/sqlite'
import { TasksRepo } from './storage/tasksRepo'
import { DouyinCrawler } from './platforms/dy/crawler'
import { DouyinLogin } from './platforms/dy/login'
import { DouyinClient } from './platforms/dy/client'
import { createStore } from './storage/storeFactory'
import { RuntimeConfig } from './runtime/types'
import { logger } from './runtime/logger'
import { TaskLogger, LogManager, getTaskLogRootPath, setTaskLogRootPath } from './runtime/taskLogger'
import { DataManager } from './runtime/dataManager'
import { randomUUID } from 'node:crypto'

let tasksRepo: TasksRepo
let dataManager: DataManager
const activeCrawlers = new Map<string, { crawler: DouyinCrawler, controller: AbortController }>()

// 获取 UserData 路径
const userDataPath = app.getPath('userData')
const defaultDbPath = path.join(userDataPath, 'database.sqlite')
const defaultLogPath = path.join(userDataPath, 'logs')
const settingsPath = path.join(userDataPath, 'system-settings.json')

// 确定资源路径
const isDev = process.env.NODE_ENV === 'development'
const resourcePath = isDev 
  ? path.join(process.cwd()) // 开发环境：项目根目录
  : process.resourcesPath // 生产环境：resources 目录

import { defaultArgsFromEnv } from './runtime/config'

interface SystemSettings {
  dbPath: string
  logPath: string
  logRetentionDays: number
  headless: boolean
}

const defaultSystemSettings: SystemSettings = {
  dbPath: defaultDbPath,
  logPath: defaultLogPath,
  logRetentionDays: 7,
  headless: false
}

const normalizePath = (value: unknown, fallback: string) => {
  if (typeof value !== 'string' || !value.trim()) return fallback
  return path.resolve(value.trim())
}

const normalizeRetentionDays = (value: unknown) => {
  const days = Number(value)
  if (!Number.isFinite(days)) return defaultSystemSettings.logRetentionDays
  return Math.min(365, Math.max(1, Math.floor(days)))
}

const normalizeSettings = (input: Partial<SystemSettings>): SystemSettings => {
  return {
    dbPath: normalizePath(input.dbPath, defaultSystemSettings.dbPath),
    logPath: normalizePath(input.logPath, defaultSystemSettings.logPath),
    logRetentionDays: normalizeRetentionDays(input.logRetentionDays),
    headless: Boolean(input.headless)
  }
}

const loadSystemSettings = (): SystemSettings => {
  try {
    if (!fs.existsSync(settingsPath)) return { ...defaultSystemSettings }
    const raw = fs.readFileSync(settingsPath, 'utf-8')
    const parsed = JSON.parse(raw || '{}')
    return normalizeSettings({
      dbPath: parsed.dbPath ?? defaultSystemSettings.dbPath,
      logPath: parsed.logPath ?? defaultSystemSettings.logPath,
      logRetentionDays: parsed.logRetentionDays ?? defaultSystemSettings.logRetentionDays,
      headless: parsed.headless ?? defaultSystemSettings.headless
    })
  } catch {
    return { ...defaultSystemSettings }
  }
}

const saveSystemSettings = (settings: SystemSettings) => {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

const sanitizeFileName = (value: string) => value.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 200)

const ensureUniqueFilePath = (dir: string, filename: string) => {
  const ext = path.extname(filename)
  const base = path.basename(filename, ext)
  let target = path.join(dir, filename)
  let index = 1
  while (fs.existsSync(target)) {
    target = path.join(dir, `${base}(${index})${ext}`)
    index += 1
  }
  return target
}

const getExtensionFromContentType = (contentType: string) => {
  const value = contentType.toLowerCase().split(';')[0].trim()
  if (value.includes('video/mp4')) return '.mp4'
  if (value.includes('video/webm')) return '.webm'
  if (value.includes('video/quicktime')) return '.mov'
  if (value.includes('audio/mpeg')) return '.mp3'
  if (value.includes('audio/mp4')) return '.m4a'
  if (value.includes('audio/aac')) return '.aac'
  if (value.includes('audio/wav')) return '.wav'
  if (value.includes('audio/ogg')) return '.ogg'
  if (value.includes('application/octet-stream')) return ''
  return ''
}

const getFileNameFromDisposition = (contentDisposition: string) => {
  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]).replace(/["']/g, '')
    } catch {
      return utf8Match[1].replace(/["']/g, '')
    }
  }
  const basicMatch = contentDisposition.match(/filename\s*=\s*("?)([^";]+)\1/i)
  if (basicMatch?.[2]) {
    return basicMatch[2].trim()
  }
  return ''
}

export async function setupIpc() {
  console.log('[IPC] Setting up IPC...')
  let systemSettings = loadSystemSettings()
  let currentDbPath = systemSettings.dbPath
  setTaskLogRootPath(systemSettings.logPath)

  const defaultConfig = defaultArgsFromEnv()
  const config: RuntimeConfig = {
    ...defaultConfig,
    runPath: resourcePath,
    sqlitePath: currentDbPath,
    headless: systemSettings.headless
  }

  let runtimeDb: SqliteDb | null = null
  const initRuntimeStorage = async () => {
    if (runtimeDb) {
      await runtimeDb.close()
      runtimeDb = null
    }
    fs.mkdirSync(path.dirname(currentDbPath), { recursive: true })
    config.sqlitePath = currentDbPath
    runtimeDb = await openSqlite({ ...config, sqlitePath: currentDbPath })
    await initSqliteSchema(runtimeDb)
    tasksRepo = new TasksRepo({ ...config, sqlitePath: currentDbPath, saveDataOption: 'json' })
    dataManager = new DataManager(runtimeDb)
  }
  await initRuntimeStorage()

  await LogManager.cleanup(systemSettings.logRetentionDays)

  // 2. 注册 IPC
  
  // 调度器定时器引用
  let scheduleTimer: NodeJS.Timeout | null = null
  const mediaDownloadStatus = new Map<string, {
    status: 'downloading' | 'done' | 'error'
    progress: number
    receivedBytes: number
    totalBytes: number
    filePath?: string
    error?: string
  }>()

  // 辅助函数：广播事件
  const broadcast = (channel: string, data: any) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send(channel, data)
    })
  }

  // 注册日志监听，转发给渲染进程
  logger.onLog((level: string, message: string) => {
    const timestamp = new Date().toLocaleString()
    broadcast('task:log', `${timestamp} ${message}`)
  })

  // 调度器核心逻辑：事件驱动
  const setupScheduler = async () => {
    if (scheduleTimer) clearTimeout(scheduleTimer)
    scheduleTimer = null

    try {
       const now = Date.now()
       const db = await openSqlite({ ...config, sqlitePath: currentDbPath })
       const task = await db.get<any>(
         "SELECT * FROM task_table WHERE schedule_enabled = 1 AND schedule_next_run IS NOT NULL ORDER BY schedule_next_run ASC LIMIT 1"
       )
       
       if (!task) {
           console.log('[Scheduler] No upcoming tasks found.')
           return 
       }

       const nextRun = Number(task.schedule_next_run)
       const diff = nextRun - now
       
       console.log(`[Scheduler] Next task ${task.task_id} at ${new Date(nextRun).toLocaleString()} (in ${diff}ms)`)

       if (diff <= 0) {
         // 任务已过期或到期，尝试执行
         // 先检查是否正在运行
         if (task.status === 'running' || activeCrawlers.has(String(task.task_id))) {
             console.log(`[Scheduler] Task ${task.task_id} is running, rescheduling...`)
             // 休眠 5秒 再检查
             scheduleTimer = setTimeout(setupScheduler, 5000)
             return
         }

         // 立即执行
         // 执行前先移除 schedule_next_run，防止重复触发
         // 对于 interval 任务，这很重要，因为我们要在 finish 时才更新它。
         // 如果不清除，finish 之前如果 setupScheduler 被意外触发（比如其他任务变动），就会重复执行。
         // 对于 once 任务，反正 triggerTask 会清除它。
         await tasksRepo.updateTask(String(task.task_id), { schedule_next_run: null })
         
         triggerTask(task)
       } else {
         // 等待执行
         // 注意 setTimeout 上限约为 24.8 天
         if (diff > 2147483647) {
            console.warn('[Scheduler] Task scheduled too far in future, sleeping for max duration')
            scheduleTimer = setTimeout(setupScheduler, 2147483647)
         } else {
            scheduleTimer = setTimeout(() => {
                // 触发时也做同样的保护
                triggerTaskWrapper(task)
            }, diff)
         }
       }
    } catch (err) {
       console.error('[Scheduler] Setup error:', err)
       // 出错后兜底重试，避免调度器挂死
       scheduleTimer = setTimeout(setupScheduler, 60000)
    }
  }

  // 包装 triggerTask，增加去重保护
  const triggerTaskWrapper = async (task: any) => {
      // 再次检查是否正在运行（因为 setTimeout 期间可能被手动启动了）
      if (task.status === 'running' || activeCrawlers.has(String(task.task_id))) {
           console.log(`[Scheduler] Task ${task.task_id} is running (in wrapper), skipping...`)
           setupScheduler()
           return
      }
      // 清除 next_run 防止重复
      await tasksRepo.updateTask(String(task.task_id), { schedule_next_run: null })
      triggerTask(task)
  }

  const triggerTask = async (row: any) => {
    const taskId = String(row.task_id)
    console.log(`[Scheduler] Triggering task ${taskId}`)
    
    try {
      if (row.status === 'running' || activeCrawlers.has(taskId)) {
        console.log(`[Scheduler] Task ${taskId} is already running, skipping this run`)
      } else {
        // 启动任务
        // 注意：这里不 await startTaskInternal，因为我们希望调度器尽快安排下一个
        // 但是我们需要先更新 schedule_next_run，否则 setupScheduler 会再次查到它（如果 diff <= 0）
        startTaskInternal(taskId, config, resourcePath, broadcast, false).catch(err => {
           console.error(`[Scheduler] Failed to start task ${taskId}:`, err)
        })
      }

      // 更新下一次运行时间
      const now = Date.now()
      let updatePatch: any = {}
      
      // 只有 once 任务在触发时就标记为完成/禁用
      // interval 任务在任务完成时更新
      if (row.schedule_type === 'once') {
         updatePatch.schedule_enabled = 0
         updatePatch.schedule_next_run = null
      }
      
      if (Object.keys(updatePatch).length > 0) {
        await tasksRepo.updateTask(taskId, updatePatch)
      }
    } catch (err) {
      console.error(`[Scheduler] Trigger error for ${taskId}:`, err)
    } finally {
      // 触发下一个调度检查
      setupScheduler()
    }
  }

  // 辅助函数：启动任务逻辑 (供 task:start 和 Scheduler 使用)
  const startTaskInternal = async (taskId: string, config: RuntimeConfig, resourcePath: string, broadcast: any, throwOnRunning = false) => {
      const task = await tasksRepo.getTask(taskId)
      if (!task) throw new Error('Task not found')
      
      if (activeCrawlers.has(taskId)) {
        if (throwOnRunning) {
            throw new Error('任务正在运行中，请勿重复启动')
        }
        // 如果是定时任务自动触发，可能已经在运行，忽略即可
        return
      }
  
      const params = task.parameters || {}
      const runConfig: RuntimeConfig = {
        ...config,
        ...params,
        runPath: resourcePath,
        sqlitePath: currentDbPath
      }
  
      // 如果指定了账号，从数据库加载 Cookie
      if (params.accountId) {
        const store = createStore({ ...config, saveDataOption: 'sqlite', sqlitePath: currentDbPath })
        const cookieStr = await store.getCookie(params.accountId)
        if (cookieStr) {
          runConfig.loginType = 'cookie'
          runConfig.account = params.accountId
          runConfig.cookies = cookieStr
        } else {
          console.warn(`未找到账号 ${params.accountId} 的 Cookie，将降级为扫码登录`)
        }
      }
  
      console.log('[Task] Starting task with merged config:', JSON.stringify({
        ...runConfig,
        cookies: runConfig.cookies ? '***' : undefined,
        mysqlPassword: '***'
      }, null, 2))
  
      const crawler = new DouyinCrawler(runConfig)
      const controller = new AbortController()
      activeCrawlers.set(taskId, { crawler, controller })
  
      // 创建任务日志器
      const taskLogger = new TaskLogger(taskId)

      crawler.start({
        taskId,
        cancelSignal: controller.signal,
        logger: taskLogger
      }).then(async () => {
        activeCrawlers.delete(taskId)
        tasksRepo.updateStatus(taskId, 'completed', { end_time: Date.now(), progress: 100 })
        broadcast('task:update', { taskId, type: 'completed' })
        await updateNextRunAfterFinish(taskId)
      }).catch(async err => {
        console.error(`Task ${taskId} error:`, err)
        activeCrawlers.delete(taskId)
        
        // 区分手动取消和其他错误
        const isCancelled = err.message === 'closed_by_user' || err.message.includes('AbortError')
        const status = isCancelled ? 'failed' : 'failed' // 也可以用 'cancelled' 但前端可能没适配
        const errMsg = isCancelled ? '用户手动停止' : err.message

        await tasksRepo.updateStatus(taskId, status, { error: errMsg, end_time: Date.now() })
        broadcast('task:update', { taskId, type: status, error: errMsg })
        await updateNextRunAfterFinish(taskId)
      })
  
      await tasksRepo.updateStatus(taskId, 'running', { start_time: Date.now(), progress: 0 })
      broadcast('task:update', { taskId, type: 'running' })
  }

  // 任务完成后更新下一次运行时间
  const updateNextRunAfterFinish = async (taskId: string) => {
      try {
          const task = await tasksRepo.getTask(taskId)
          if (task && task.schedule_enabled && task.schedule_type === 'interval' && task.schedule_interval_ms) {
              const next = Date.now() + Number(task.schedule_interval_ms)
              console.log(`[Scheduler] Task ${taskId} finished, next run at ${new Date(next).toLocaleString()}`)
              await tasksRepo.updateTask(taskId, { schedule_next_run: next })
              setupScheduler()
          }
      } catch (err) {
          console.error(`[Scheduler] Failed to update next run for ${taskId}:`, err)
      }
  }

  // 启动调度器
  setupScheduler()

  ipcMain.handle('settings:get', async () => {
    return {
      ...systemSettings,
      dbPath: currentDbPath,
      logPath: getTaskLogRootPath()
    }
  })

  ipcMain.handle('settings:pick-directory', async (_, defaultPath?: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: typeof defaultPath === 'string' && defaultPath.trim()
        ? path.resolve(defaultPath.trim())
        : userDataPath
    })
    if (result.canceled || !result.filePaths.length) {
      return { canceled: true }
    }
    return { canceled: false, path: result.filePaths[0] }
  })

  ipcMain.handle('settings:save', async (_, payload: Partial<SystemSettings>) => {
    const nextSettings = normalizeSettings({
      ...systemSettings,
      ...payload
    })
    const shouldResetDb = nextSettings.dbPath !== currentDbPath
    try {
      currentDbPath = nextSettings.dbPath
      setTaskLogRootPath(nextSettings.logPath)
      config.headless = nextSettings.headless
      if (shouldResetDb) {
        await initRuntimeStorage()
      }
      systemSettings = nextSettings
      saveSystemSettings(systemSettings)
      await LogManager.cleanup(systemSettings.logRetentionDays)
      setupScheduler()
      return { success: true }
    } catch (err: any) {
      throw new Error(err?.message || '保存系统设置失败')
    }
  })

  ipcMain.handle('settings:clear-logs', async () => {
    try {
      return await LogManager.clearAll()
    } catch (err: any) {
      throw new Error(err?.message || '清除日志失败')
    }
  })

  // --- 账号管理 ---
  ipcMain.handle('account:list', async () => {
    const db = await openSqlite({ ...config, sqlitePath: currentDbPath })
    const rows = await db.all("SELECT * FROM account_cookies WHERE platform = 'dy' ORDER BY last_modify_ts DESC")
    return rows
  })

  ipcMain.handle('account:delete', async (_, accountId) => {
    const db = await openSqlite({ ...config, sqlitePath: currentDbPath })
    await db.run("DELETE FROM account_cookies WHERE platform = 'dy' AND account_id = ?", [accountId])
    return { success: true }
  })

  ipcMain.handle('account:add', async () => {
    let browser = null
    try {
      // 启动浏览器
      browser = await chromium.launch({ headless: false })
      const context = await browser.newContext()
      
      // 注入 stealth
      const stealthPath = path.join(resourcePath, "libs", "stealth.min.js")
      await context.addInitScript({ path: stealthPath }).catch(() => undefined)
      
      const page = await context.newPage()
      await page.goto("https://www.douyin.com", { waitUntil: "domcontentloaded" })

      // 执行登录
      const login = new DouyinLogin({
        loginType: 'qrcode',
        browserContext: context,
        contextPage: page
      })
      await login.begin()

      // 获取 Cookies
      const cookies = await context.cookies()

      // 获取用户信息
      const userInfo = await page.evaluate(() => {
        const user = JSON.parse(localStorage.getItem('user_info') || '{}')
        return {
          uid: user.uid || '',
          nickname: user.nickname || '',
          avatarUrl: user.avatarUrl || '',
        }
      })
      
      // 尝试获取 accountId，优先使用 uid，其次 fallback 到 passport_uid 或 uid_tt
      let finalAccountId = userInfo.uid || ''
      
      if (!finalAccountId) {
         const uidCookie = cookies.find(c => c.name === 'passport_uid' || c.name === 'uid_tt')
         if (uidCookie) finalAccountId = uidCookie.value
      }
      
      if (!finalAccountId) {
         // 最后的兜底：生成一个随机ID
         finalAccountId = 'dy_' + Date.now()
      }
      // 保存到数据库
      // 强制使用 SQLite 存储 Cookie
      const store = createStore({ ...config, saveDataOption: 'sqlite', sqlitePath: currentDbPath })
      await store.saveCookie(finalAccountId, JSON.stringify(cookies), {
        nickname: userInfo.nickname,
        avatar: userInfo.avatarUrl,
        uid: userInfo.uid
      })
      
      return { success: true, accountId: finalAccountId }
    } catch (err: any) {
      console.error('Add account failed:', err)
      return { success: false, message: err.message }
    } finally {
      if (browser) await browser.close()
    }
  })

  // 辅助函数：计算下一次运行时间
  const calculateNextRun = (data: any): number | null => {
      const type = data.schedule_type;
      const enabled = data.schedule_enabled === 1 || data.schedule_enabled === true;
      const at = data.schedule_at;
      const interval = data.schedule_interval_ms;
      
      if (!enabled) return null;

      if (type === 'once') {
          return (at && at > 0) ? at : null;
      } else if (type === 'interval') {
          // 如果有指定开始时间，优先使用
          if (at && at > 0) return at;
          // 否则使用当前时间 + 间隔
          if (interval && interval > 0) return Date.now() + interval;
      }
      return null;
  }

  // --- 任务管理 ---
  ipcMain.handle('task:create', async (_, taskData: any) => {
    const taskId = randomUUID()
    
    // 确保数据类型正确
    const task: any = {
      taskId,
      taskName: taskData.name || '未命名任务',
      createdBy: 'system',
      parameters: taskData.parameters || {},
      priority: 0,
      maxRetries: 3,
      schedule_type: taskData.schedule_type,
      schedule_enabled: taskData.schedule_enabled ? 1 : 0,
      schedule_at: taskData.schedule_at,
      schedule_interval_ms: taskData.schedule_interval_ms
    }
    
    // 如果 Repo 内部逻辑没有覆盖，我们可以在这里预先计算（虽然 Repo 可能会覆盖，但多一层保障）
    // 其实 TasksRepo.createTask 内部会调用 computeSchedulePatch，所以这里不需要手动计算 next_run
    // 除非我们传进去的 task 对象直接包含 schedule_next_run 并且 Repo 尊重它。
    // 看 Repo 代码，Repo 是忽略 input 中的 next_run 的。
    
    await tasksRepo.createTask(task)
    setupScheduler()
    broadcast('task:update', { taskId, type: 'created' })
    return { taskId }
  })

  ipcMain.handle('task:update', async (_, { taskId, data }: { taskId: string; data: any }) => {
    // 获取当前任务状态，以便合并计算
    const currentTask = await tasksRepo.getTask(taskId)
    if (!currentTask) throw new Error('Task not found')

    // 合并新旧数据来计算 next_run
    // 注意 data 里的字段可能是 undefined，需要小心合并
    const merged = {
        schedule_type: data.schedule_type !== undefined ? data.schedule_type : currentTask.schedule_type,
        schedule_enabled: data.schedule_enabled !== undefined ? data.schedule_enabled : currentTask.schedule_enabled,
        schedule_at: data.schedule_at !== undefined ? data.schedule_at : currentTask.schedule_at,
        schedule_interval_ms: data.schedule_interval_ms !== undefined ? data.schedule_interval_ms : currentTask.schedule_interval_ms
    }
    
    // 只有当调度相关字段发生变化时，才重新计算 next_run
    // 或者简单点：只要有调度字段更新，就重新计算
    if (data.schedule_type !== undefined || data.schedule_enabled !== undefined || data.schedule_at !== undefined || data.schedule_interval_ms !== undefined) {
        const nextRun = calculateNextRun(merged)
        // 只有当计算出有效 nextRun 或者 明确被禁用时才更新
        // 如果 nextRun 是 null，可能是因为 enabled=0，或者参数不全
        // 我们应该把计算结果写入 data
        data.schedule_next_run = nextRun
    }

    await tasksRepo.updateTask(taskId, data)
    setupScheduler()
    broadcast('task:update', { taskId, type: 'updated' })
    return { success: true }
  })

  ipcMain.handle('task:list', async (_, params) => {
    return await tasksRepo.listTasks(params || {})
  })

  ipcMain.handle('task:delete', async (_, taskId) => {
    const task = await tasksRepo.getTask(taskId)
    if (task && (task.status === 'running' || activeCrawlers.has(taskId))) {
        throw new Error('Cannot delete running task')
    }
    await tasksRepo.deleteTask(taskId)
    setupScheduler()
    broadcast('task:update', { taskId, type: 'deleted' })
    return { success: true }
  })

  ipcMain.handle('task:start', async (_, taskId) => {
    await startTaskInternal(taskId, config, resourcePath, broadcast, true)
    return { status: 'started' }
  })

  ipcMain.handle('task:stop', async (_, taskId) => {
    const item = activeCrawlers.get(taskId)
    if (item) {
        // 发送终止信号
        item.controller.abort()
        // 这里不需要手动 activeCrawlers.delete，因为 startTaskInternal 的 catch 会处理
        return { success: true }
    }
    return { success: false, message: 'Task not running' }
  })

  // --- 数据查询 ---
  ipcMain.handle('task:logs:read', async (_, taskId) => {
    return LogManager.getLogContent(taskId)
  })

  ipcMain.handle('data:query', async (_, params) => {
    const db = await openSqlite({ ...config, sqlitePath: currentDbPath })
    const { table, page = 1, pageSize = 20, keyword, searchFields, startDate, endDate, sortProp = 'add_ts', sortOrder = 'DESC' } = params
    const offset = (page - 1) * pageSize
    
    const validTables = ['douyin_aweme', 'douyin_aweme_comment', 'dy_creator', 'xhs_note', 'xhs_note_comment', 'xhs_creator']
    if (!validTables.includes(table)) throw new Error('Invalid table')

    // 检查表是否存在，防止首次启动或未初始化对应平台数据时报错
    const tableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table])
    if (!tableExists) {
      return { items: [], total: 0 }
    }

    let conditionsArr: string[] = []
    let queryParams: any[] = []

    if (keyword && searchFields && Array.isArray(searchFields) && searchFields.length > 0) {
      const keywordConditions = searchFields.map((field: string) => `${field} LIKE ?`).join(' OR ')
      conditionsArr.push(`(${keywordConditions})`)
      const likeKeyword = `%${keyword}%`
      for (let i = 0; i < searchFields.length; i++) {
        queryParams.push(likeKeyword)
      }
    }

    if (startDate || endDate) {
      // Determine the time field based on the table
      let timeField = 'create_time'
      
      // Some tables do not have create_time.
      if (table === 'xhs_note') {
        timeField = 'time'
      } else if (table === 'dy_creator' || table === 'xhs_creator') {
        // Creator tables usually don't have a specific post date.
        // We fallback to add_ts (crawl time) or just ignore date filter.
        timeField = 'add_ts'
      }

      // Convert from JS timestamp (ms) to DB timestamp if necessary
      // It depends on how you store them. Usually add_ts is ms.
      // create_time in douyin_aweme is usually seconds (10 digits).
      // We will assume the DB stores 13 digits, if it stores 10 digits, we need to divide by 1000.
      const isSeconds = timeField === 'create_time' || timeField === 'time'

      if (startDate) {
        conditionsArr.push(`${timeField} >= ?`)
        queryParams.push(isSeconds ? Math.floor(startDate / 1000) : startDate)
      }
      if (endDate) {
        // Set to the end of the day
        conditionsArr.push(`${timeField} <= ?`)
        const endOfDay = endDate + 24 * 60 * 60 * 1000 - 1
        queryParams.push(isSeconds ? Math.floor(endOfDay / 1000) : endOfDay)
      }
    }

    let whereClause = ''
    if (conditionsArr.length > 0) {
      whereClause = `WHERE ${conditionsArr.join(' AND ')}`
    }

    // 防注入：仅允许特定字段和方向
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
    const validSortProps = ['id', 'create_time', 'add_ts', 'time', 'last_modify_ts', 'phone', 'is_exported']
    const safeSortProp = validSortProps.includes(sortProp) ? sortProp : 'add_ts'

    const rows = await db.all(`SELECT * FROM ${table} ${whereClause} ORDER BY ${safeSortProp} ${safeSortOrder} LIMIT ? OFFSET ?`, [...queryParams, pageSize, offset])
    const count = await db.get(`SELECT COUNT(*) as c FROM ${table} ${whereClause}`, queryParams)
    return { items: rows, total: count.c }
  })

  ipcMain.handle('data:delete', async (_, { table, ids }) => {
    return await dataManager.deleteItems(table, ids)
  })

  ipcMain.handle('data:export', async (_, { table, ids }) => {
    return await dataManager.exportToExcel(table, ids)
  })

  ipcMain.handle('media:download', async (_, { url, mediaType, downloadId: requestDownloadId, preferredName }: { url: string; mediaType?: 'video' | 'music'; downloadId?: string; preferredName?: string }) => {
    const downloadId = requestDownloadId || `${Date.now()}_${Math.random().toString(16).slice(2)}`
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
      throw new Error('无效下载链接')
    }
    mediaDownloadStatus.set(downloadId, {
      status: 'downloading',
      progress: 0,
      receivedBytes: 0,
      totalBytes: 0
    })
    const response = await fetch(url)
    if (!response.ok || !response.body) {
      mediaDownloadStatus.set(downloadId, {
        status: 'error',
        progress: 0,
        receivedBytes: 0,
        totalBytes: 0,
        error: `下载失败: ${response.status}`
      })
      throw new Error(`下载失败: ${response.status}`)
    }
    const contentType = response.headers.get('content-type') || ''
    if (contentType.toLowerCase().includes('text/html')) {
      mediaDownloadStatus.set(downloadId, {
        status: 'error',
        progress: 0,
        receivedBytes: 0,
        totalBytes: 0,
        error: '下载链接返回网页内容，可能已失效'
      })
      throw new Error('下载链接返回网页内容，可能已失效')
    }
    const totalBytes = Number(response.headers.get('content-length') || 0)
    const parsed = new URL(url)
    const pathName = parsed.pathname || ''
    const dispositionName = getFileNameFromDisposition(response.headers.get('content-disposition') || '')
    const pathNameName = (() => {
      const raw = path.basename(pathName)
      try {
        return decodeURIComponent(raw)
      } catch {
        return raw
      }
    })()
    const headerOrPathName = dispositionName || pathNameName
    const extFromName = path.extname(headerOrPathName)
    const extFromType = getExtensionFromContentType(contentType)
    const extByMediaType = mediaType === 'video' ? '.mp4' : mediaType === 'music' ? '.mp3' : '.bin'
    const finalExt = extFromName || extFromType || extByMediaType
    const baseFromName = path.basename(headerOrPathName, extFromName || undefined).trim()
    const preferredBase = typeof preferredName === 'string' ? preferredName.trim() : ''
    const finalBase = sanitizeFileName(preferredBase || baseFromName || `${mediaType || 'media'}_${Date.now()}`)
    const fileName = `${finalBase}${finalExt}`
    const downloadDir = app.getPath('downloads')
    fs.mkdirSync(downloadDir, { recursive: true })
    const filePath = ensureUniqueFilePath(downloadDir, fileName)

    const writeStream = fs.createWriteStream(filePath)
    let receivedBytes = 0
    const progressStream = new Transform({
      transform(chunk, _encoding, callback) {
        const size = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk)
        receivedBytes += size
        const progress = totalBytes > 0 ? Math.min(99, Math.floor((receivedBytes / totalBytes) * 100)) : 0
        mediaDownloadStatus.set(downloadId, {
          status: 'downloading',
          progress,
          receivedBytes,
          totalBytes,
          filePath
        })
        callback(null, chunk)
      }
    })
    try {
      await pipeline(Readable.fromWeb(response.body as any), progressStream, writeStream)
      mediaDownloadStatus.set(downloadId, {
        status: 'done',
        progress: 100,
        receivedBytes,
        totalBytes,
        filePath
      })
      return { success: true, filePath, downloadId }
    } catch (err: any) {
      mediaDownloadStatus.set(downloadId, {
        status: 'error',
        progress: 0,
        receivedBytes,
        totalBytes,
        filePath,
        error: err?.message || '下载失败'
      })
      throw err
    }
  })

  ipcMain.handle('media:download:status', async (_, { downloadId }: { downloadId: string }) => {
    return mediaDownloadStatus.get(downloadId) || null
  })
}
