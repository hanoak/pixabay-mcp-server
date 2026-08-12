import { describe, expect, it } from 'vitest'
import { toErrorResult, toSuccessResult } from '../../src/tools/result.js'

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
