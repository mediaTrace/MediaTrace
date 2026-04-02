import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { logger } from './logger'

const LOG_DIR_NAME = 'logs'
const TASK_LOG_DIR_NAME = 'tasks'
const defaultLogRootPath = path.join(app.getPath('userData'), LOG_DIR_NAME)
let currentLogRootPath = defaultLogRootPath

const getTaskLogDir = () => path.join(currentLogRootPath, TASK_LOG_DIR_NAME)

const ensureTaskLogDir = () => {
  const logDir = getTaskLogDir()
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

export const setTaskLogRootPath = (logRootPath: string) => {
  if (!logRootPath || typeof logRootPath !== 'string') return
  currentLogRootPath = path.resolve(logRootPath)
  ensureTaskLogDir()
}

export const getTaskLogRootPath = () => currentLogRootPath

export class TaskLogger {
  private taskId: string
  private logPath: string

  constructor(taskId: string) {
    this.taskId = taskId
    const logDir = ensureTaskLogDir()
    this.logPath = path.join(logDir, `${taskId}.log`)
  }

  public info(message: string) {
    this.write('INFO', message)
    logger.info(message) // Propagate to global logger (and thus IPC)
  }

  public warn(message: string) {
    this.write('WARN', message)
    logger.warn(message)
  }

  public error(message: string) {
    this.write('ERROR', message)
    logger.error(message)
  }

  private write(level: string, message: string) {
    const timestamp = new Date().toLocaleString()
    const logLine = `[${timestamp}] [${level}] ${message}\n`
    
    // Write to file (append)
    fs.appendFile(this.logPath, logLine, (err) => {
      if (err) console.error('Failed to write log:', err)
    })
  }

  public getLogPath() {
    return this.logPath
  }
}

export const LogManager = {
  getLogContent: async (taskId: string): Promise<string[]> => {
    const logPath = path.join(getTaskLogDir(), `${taskId}.log`)
    if (!fs.existsSync(logPath)) return []
    
    try {
      const content = await fs.promises.readFile(logPath, 'utf-8')
      // Remove empty lines
      return content.split('\n').filter(line => line.trim().length > 0)
    } catch (e) {
      console.error('Read log failed', e)
      return []
    }
  },

  cleanup: async (retentionDays: number = 7) => {
    const logDir = getTaskLogDir()
    if (!fs.existsSync(logDir)) return

    try {
      const files = await fs.promises.readdir(logDir)
      const now = Date.now()
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000

      for (const file of files) {
        if (!file.endsWith('.log')) continue
        const filePath = path.join(logDir, file)
        const stats = await fs.promises.stat(filePath)
        if (now - stats.mtimeMs > retentionMs) {
          await fs.promises.unlink(filePath)
          console.log(`[LogManager] Deleted old log file: ${file}`)
        }
      }
    } catch (e) {
      console.error('[LogManager] Cleanup failed', e)
    }
  },

  clearAll: async () => {
    const logDir = getTaskLogDir()
    if (!fs.existsSync(logDir)) return { deletedCount: 0 }
    let deletedCount = 0
    try {
      const files = await fs.promises.readdir(logDir)
      for (const file of files) {
        if (!file.endsWith('.log')) continue
        const filePath = path.join(logDir, file)
        await fs.promises.unlink(filePath)
        deletedCount += 1
      }
      return { deletedCount }
    } catch (e) {
      console.error('[LogManager] Clear all logs failed', e)
      throw e
    }
  }
}
