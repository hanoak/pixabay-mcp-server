import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config.js'

describe('loadConfig', () => {
  it('throws an actionable error when PIXABAY_API_KEY is missing', () => {
    expect(() => loadConfig({})).toThrowError(/PIXABAY_API_KEY is not set/)
  })

  it('returns the api key and defaults log level to info', () => {
    const config = loadConfig({ PIXABAY_API_KEY: 'test-key' })
    expect(config.apiKey).toBe('test-key')
    expect(config.logLevel).toBe('info')
  })

  it('parses a valid LOG_LEVEL', () => {
    const config = loadConfig({ PIXABAY_API_KEY: 'test-key', LOG_LEVEL: 'debug' })
    expect(config.logLevel).toBe('debug')
  })

  it('falls back to info for an invalid LOG_LEVEL', () => {
    const config = loadConfig({ PIXABAY_API_KEY: 'test-key', LOG_LEVEL: 'verbose' })
    expect(config.logLevel).toBe('info')
  })
})
