import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLogger, parseLogLevel } from '../../src/lib/logger.js'
import { createRedactor } from '../../src/lib/redact.js'

describe('parseLogLevel', () => {
  it('accepts known levels', () => {
    expect(parseLogLevel('debug')).toBe('debug')
    expect(parseLogLevel('warn')).toBe('warn')
    expect(parseLogLevel('error')).toBe('error')
  })

  it('defaults unknown or missing values to info', () => {
    expect(parseLogLevel(undefined)).toBe('info')
    expect(parseLogLevel('nonsense')).toBe('info')
  })
})

describe('createLogger', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    errorSpy.mockRestore()
  })

  it('writes only to stderr (console.error), never stdout', () => {
    const logger = createLogger('debug')
    logger.info('hello')
    expect(errorSpy).toHaveBeenCalledWith('[pixabay-mcp-server] [info] hello')
  })

  it('suppresses messages below the configured threshold', () => {
    const logger = createLogger('warn')
    logger.debug('should not appear')
    logger.info('should not appear either')
    expect(errorSpy).not.toHaveBeenCalled()

    logger.warn('should appear')
    expect(errorSpy).toHaveBeenCalledWith('[pixabay-mcp-server] [warn] should appear')
  })

  it('redacts every message through the given redactor before writing it', () => {
    const logger = createLogger('debug', createRedactor('super-secret-key'))
    logger.info('url was https://pixabay.com/api/?key=super-secret-key&q=cats')
    expect(errorSpy).toHaveBeenCalledWith(
      '[pixabay-mcp-server] [info] url was https://pixabay.com/api/?key=[REDACTED]&q=cats',
    )
  })

  it('defaults to a no-op redactor when none is given', () => {
    const logger = createLogger('debug')
    logger.info('PIXABAY_API_KEY is not set')
    expect(errorSpy).toHaveBeenCalledWith('[pixabay-mcp-server] [info] PIXABAY_API_KEY is not set')
  })
})
