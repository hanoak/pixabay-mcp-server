import { type LogLevel, parseLogLevel } from './lib/logger.js'

export interface Config {
  apiKey: string
  logLevel: LogLevel
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.PIXABAY_API_KEY
  if (!apiKey) {
    throw new Error(
      'PIXABAY_API_KEY is not set. Get a free key at https://pixabay.com/api/docs/ ' +
        'and set it as an environment variable before starting this server.',
    )
  }

  return {
    apiKey,
    logLevel: parseLogLevel(env.LOG_LEVEL),
  }
}
