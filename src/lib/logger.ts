export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface Logger {
  debug: (message: string) => void
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export function parseLogLevel(value: string | undefined): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value
  }
  return 'info'
}

// stderr-only: stdout is the JSON-RPC transport for this stdio MCP server and must
// never carry anything else.
export function createLogger(level: LogLevel = 'info'): Logger {
  const threshold = LEVEL_WEIGHT[level]
  const log = (messageLevel: LogLevel, message: string): void => {
    if (LEVEL_WEIGHT[messageLevel] >= threshold) {
      console.error(`[${messageLevel}] ${message}`)
    }
  }

  return {
    debug: (message) => log('debug', message),
    info: (message) => log('info', message),
    warn: (message) => log('warn', message),
    error: (message) => log('error', message),
  }
}
