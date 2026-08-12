import { describe, expect, it } from 'vitest'
import { createPixabayApiError, PixabayApiError } from '../../src/pixabay/errors.js'

describe('PixabayApiError', () => {
  it('carries the status code and message', () => {
    const error = new PixabayApiError(429, 'API rate limit exceeded')
    expect(error.status).toBe(429)
    expect(error.message).toBe('API rate limit exceeded')
    expect(error.name).toBe('PixabayApiError')
    expect(error).toBeInstanceOf(Error)
  })
})

describe('createPixabayApiError', () => {
  it('prefixes a 400 with a clear "malformed request" statement', () => {
    const error = createPixabayApiError(400, "Bad Request. Missing parameter 'q'.")
    expect(error.status).toBe(400)
    expect(error.message).toBe(
      "Pixabay rejected the request as malformed: Bad Request. Missing parameter 'q'.",
    )
  })

  it('tells the caller to check the API key on a 403', () => {
    const error = createPixabayApiError(403, 'Forbidden')
    expect(error.message).toContain('check that PIXABAY_API_KEY is valid and active')
  })

  it('labels a 429 as a rate limit', () => {
    const error = createPixabayApiError(429, 'API rate limit exceeded')
    expect(error.message).toContain('Pixabay API rate limit exceeded')
  })

  it('labels any 5xx as a likely-transient server error', () => {
    const error502 = createPixabayApiError(502, 'Bad Gateway')
    const error503 = createPixabayApiError(503, 'Service Unavailable')
    expect(error502.message).toContain('usually transient')
    expect(error503.message).toContain('usually transient')
  })

  it('falls back to a generic message for an unrecognized status', () => {
    const error = createPixabayApiError(418, "I'm a teapot")
    expect(error.message).toBe("Pixabay API request failed: I'm a teapot")
  })

  it('omits the trailing colon when the raw message is empty', () => {
    const error = createPixabayApiError(500, '')
    expect(error.message).toBe(
      "Pixabay's API returned a server error — this is usually transient, try again shortly",
    )
  })
})
