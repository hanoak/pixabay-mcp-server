import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { parseResponse, SchemaValidationError } from '../../src/schemas/parse.js'
import type { Logger } from '../../src/lib/logger.js'

function fakeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

const schema = z.object({ id: z.number() })

describe('parseResponse', () => {
  it('returns the parsed data on success, without logging', () => {
    const logger = fakeLogger()
    const result = parseResponse(schema, { id: 1 }, 'image search', logger)
    expect(result).toEqual({ id: 1 })
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('throws a SchemaValidationError and warns via the given logger on mismatch', () => {
    const logger = fakeLogger()
    expect(() => parseResponse(schema, { id: 'not-a-number' }, 'image search', logger)).toThrow(
      SchemaValidationError,
    )
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('image search'))
  })

  it('never creates its own logger — uses exactly the one passed in', () => {
    // Regression guard: an earlier draft created a fresh default-level logger
    // internally, which would silently ignore the user's actual LOG_LEVEL.
    const logger = fakeLogger()
    try {
      parseResponse(schema, {}, 'video search', logger)
    } catch {
      // expected
    }
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('includes the invalid field paths in the warning', () => {
    const logger = fakeLogger()
    try {
      parseResponse(schema, { id: 'nope' }, 'image search', logger)
    } catch {
      // expected
    }
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('id'))
  })
})
