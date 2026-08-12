import { describe, expect, it, vi } from 'vitest'
import { handleGetImage, handleSearchImages } from '../../src/tools/images.js'
import type { ToolContext } from '../../src/tools/shared.js'
import type { ImageSearchResponse } from '../../src/schemas/image.js'

function fakeCtx(searchImagesResult: ImageSearchResponse): ToolContext {
  return {
    client: {
      searchImages: vi.fn().mockResolvedValue(searchImagesResult),
      searchVideos: vi.fn(),
    },
  }
}

describe('handleSearchImages', () => {
  it('maps query to q and defaults safesearch to true when omitted', async () => {
    const ctx = fakeCtx({ total: 1, totalHits: 1, hits: [{ id: 1, user: 'alice' }] })

    await handleSearchImages(ctx, { query: 'cats' })

    expect(ctx.client.searchImages).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'cats', safesearch: true }),
      undefined,
    )
  })

  it('honors an explicit safesearch: false', async () => {
    const ctx = fakeCtx({ total: 0, totalHits: 0, hits: [{ id: 1 }] })

    await handleSearchImages(ctx, { query: 'cats', safesearch: false })

    expect(ctx.client.searchImages).toHaveBeenCalledWith(
      expect.objectContaining({ safesearch: false }),
      undefined,
    )
  })

  it('returns formatted summaries for each hit', async () => {
    const ctx = fakeCtx({
      total: 1,
      totalHits: 1,
      hits: [{ id: 1, user: 'alice', webformatURL: 'https://cdn.pixabay.com/x.jpg' }],
    })

    const result = await handleSearchImages(ctx, {})

    expect(result.isError).toBeUndefined()
    const text = result.content[0]?.text ?? ''
    const parsed = JSON.parse(text) as Array<{ id: number; attribution: string }>
    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.attribution).toBe('by alice via Pixabay')
  })

  it('returns isError:true when no images match', async () => {
    const ctx = fakeCtx({ total: 0, totalHits: 0, hits: [] })

    const result = await handleSearchImages(ctx, { query: 'zzznonexistentzzz' })

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toMatch(/no images found/i)
  })
})

describe('handleGetImage', () => {
  it('looks up the id via searchImages and returns the full detail', async () => {
    const ctx = fakeCtx({
      total: 1,
      totalHits: 1,
      hits: [{ id: 42, user: 'bob', fullHDURL: 'https://cdn.pixabay.com/full.jpg' }],
    })

    const result = await handleGetImage(ctx, { id: 42 })

    expect(ctx.client.searchImages).toHaveBeenCalledWith({ id: 42 }, undefined)
    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0]?.text ?? '{}') as { fullHDURL: string }
    expect(parsed.fullHDURL).toBe('https://cdn.pixabay.com/full.jpg')
  })

  it('returns isError:true when the id does not exist', async () => {
    const ctx = fakeCtx({ total: 0, totalHits: 0, hits: [] })

    const result = await handleGetImage(ctx, { id: 999999 })

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toMatch(/no image found with id 999999/i)
  })
})
