import { describe, expect, it } from 'vitest'
import { toErrorResult, toErrorResultFromError, toSuccessResult } from '../../src/tools/result.js'
import { PixabayApiError } from '../../src/pixabay/errors.js'
import { SchemaValidationError } from '../../src/schemas/parse.js'

describe('toSuccessResult', () => {
  it('wraps data as pretty-printed JSON text content, without isError', () => {
    const result = toSuccessResult({ id: 1, name: 'cats' })
    expect(result.isError).toBeUndefined()
    expect(result.content).toEqual([
      { type: 'text', text: JSON.stringify({ id: 1, name: 'cats' }, null, 2) },
    ])
  })
})

describe('toErrorResult', () => {
  it('marks the result isError:true with the message as text content', () => {
    const result = toErrorResult('No images found matching your query.')
    expect(result.isError).toBe(true)
    expect(result.content).toEqual([{ type: 'text', text: 'No images found matching your query.' }])
  })
})

describe('toErrorResultFromError', () => {
  const identity = (input: string): string => input

  it('uses a PixabayApiError message as-is', () => {
    const error = new PixabayApiError(429, 'API rate limit exceeded')
    const result = toErrorResultFromError(error, identity)
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toBe('API rate limit exceeded')
  })

  it('uses a SchemaValidationError message as-is', () => {
    const error = new SchemaValidationError('image search')
    const result = toErrorResultFromError(error, identity)
    expect(result.content[0]?.text).toBe('Unexpected Pixabay response shape for image search.')
  })

  it('frames a generic Error with an "Unexpected error" prefix', () => {
    const result = toErrorResultFromError(new Error('boom'), identity)
    expect(result.content[0]?.text).toBe('Unexpected error: boom')
  })

  it('falls back to a generic message for a non-Error throw', () => {
    const result = toErrorResultFromError('not an Error object', identity)
    expect(result.content[0]?.text).toBe('Unexpected error.')
  })

  it('always redacts the resulting message before returning it', () => {
    const error = new PixabayApiError(403, 'forbidden: key=super-secret-key')
    const redact = (input: string): string => input.replace('super-secret-key', '[REDACTED]')
    const result = toErrorResultFromError(error, redact)
    expect(result.content[0]?.text).toBe('forbidden: key=[REDACTED]')
  })
})
