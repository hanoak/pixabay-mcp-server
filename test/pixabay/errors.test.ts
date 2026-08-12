import { describe, expect, it } from 'vitest'
import { PixabayApiError } from '../../src/pixabay/errors.js'

describe('PixabayApiError', () => {
  it('carries the status code and message', () => {
    const error = new PixabayApiError(429, 'API rate limit exceeded')
    expect(error.status).toBe(429)
    expect(error.message).toBe('API rate limit exceeded')
    expect(error.name).toBe('PixabayApiError')
    expect(error).toBeInstanceOf(Error)
  })
})
