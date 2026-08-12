import { type LogLevel, parseLogLevel } from './lib/logger.js'

// Thrown when the server is misconfigured (e.g. a missing API key). The message is
// user-facing guidance — index.ts's fatal() prints it verbatim to stderr and exits
// non-zero, rather than dumping a stack trace.
export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

export interface Config {
  apiKey: string
  logLevel: LogLevel
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.PIXABAY_API_KEY
  if (!apiKey) {
    throw new ConfigError(
      'PIXABAY_API_KEY is not set. Get a free key at https://pixabay.com/api/docs/ ' +
        'and set it as an environment variable before starting this server.',
    )
  }

  return {
    apiKey,
    logLevel: parseLogLevel(env.LOG_LEVEL),
  }
}
