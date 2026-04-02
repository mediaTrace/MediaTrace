export interface IpcRenderer {
  on(channel: string, listener: (...args: any[]) => void): void
  off(channel: string, listener: (...args: any[]) => void): void
  send(channel: string, ...args: any[]): void
  invoke(channel: string, ...args: any[]): Promise<any>
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer
  }
}
