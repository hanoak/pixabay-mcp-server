import { BIN_NAME } from '../version.js'
import type { Redactor } from './redact.js'

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

const NOOP_REDACTOR: Redactor = { redact: (input) => input }

// stderr-only: stdout is the JSON-RPC transport for this stdio MCP server and must
// never carry anything else. Every message is passed through the redactor (a no-op
// by default, e.g. before the API key is known during startup validation) so the
// `key` query param can never reach a log line, even at debug level.
export function createLogger(level: LogLevel = 'info', redactor: Redactor = NOOP_REDACTOR): Logger {
  const threshold = LEVEL_WEIGHT[level]
  const log = (messageLevel: LogLevel, message: string): void => {
    if (LEVEL_WEIGHT[messageLevel] >= threshold) {
      console.error(`[${BIN_NAME}] [${messageLevel}] ${redactor.redact(message)}`)
    }
  }

  return {
    debug: (message) => log('debug', message),
    info: (message) => log('info', message),
    warn: (message) => log('warn', message),
    error: (message) => log('error', message),
  }
}
