
type LogLevel = 'info' | 'warn' | 'error';
type LogCallback = (level: LogLevel, message: string) => void;

const listeners: LogCallback[] = [];

export const logger = {
  onLog(callback: LogCallback) {
    listeners.push(callback);
  },
  info(message: string): void {
    const msg = `[INFO] ${message}`;
    process.stdout.write(`${msg}\n`);
    listeners.forEach(cb => cb('info', msg));
  },
  warn(message: string): void {
    const msg = `[WARN] ${message}`;
    process.stdout.write(`${msg}\n`);
    listeners.forEach(cb => cb('warn', msg));
  },
  error(message: string): void {
    const msg = `[ERROR] ${message}`;
    process.stderr.write(`${msg}\n`);
    listeners.forEach(cb => cb('error', msg));
  },
};
