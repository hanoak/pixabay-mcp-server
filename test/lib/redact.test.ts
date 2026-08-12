import { describe, expect, it } from 'vitest'
import { createRedactor } from '../../src/lib/redact.js'

describe('createRedactor', () => {
  it('strips the raw key wherever it appears in a string', () => {
    const redactor = createRedactor('super-secret-key')

    expect(
      redactor.redact('fetch failed: https://pixabay.com/api/?key=super-secret-key&q=cats'),
    ).toBe('fetch failed: https://pixabay.com/api/?key=[REDACTED]&q=cats')
  })

  it('strips every occurrence, not just the first', () => {
    const redactor = createRedactor('abc123')
    expect(redactor.redact('abc123 and again abc123')).toBe('[REDACTED] and again [REDACTED]')
  })

  it('also strips the URL-encoded form of the key', () => {
    const redactor = createRedactor('a+b/c')
    const encoded = encodeURIComponent('a+b/c')
    expect(redactor.redact(`key=${encoded}`)).toBe('key=[REDACTED]')
  })

  it('leaves input unchanged when the key does not appear', () => {
    const redactor = createRedactor('super-secret-key')
    expect(redactor.redact('no secrets here')).toBe('no secrets here')
  })

  it('is a safe no-op for an empty key rather than mangling every character', () => {
    const redactor = createRedactor('')
    expect(redactor.redact('hello world')).toBe('hello world')
  })
})
