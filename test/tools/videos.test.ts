import { describe, expect, it, vi } from 'vitest'
import { handleGetVideo, handleSearchVideos } from '../../src/tools/videos.js'
import type { ToolContext } from '../../src/tools/shared.js'
import type { VideoSearchResponse } from '../../src/schemas/video.js'

function fakeCtx(searchVideosResult: VideoSearchResponse): ToolContext {
  return {
    client: {
      searchImages: vi.fn(),
      searchVideos: vi.fn().mockResolvedValue(searchVideosResult),
    },
  }
}

describe('handleSearchVideos', () => {
  it('maps query to q and defaults safesearch to true when omitted', async () => {
    const ctx = fakeCtx({ total: 1, totalHits: 1, hits: [{ id: 1, user: 'alice' }] })

    await handleSearchVideos(ctx, { query: 'ocean' })

    expect(ctx.client.searchVideos).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'ocean', safesearch: true }),
      undefined,
    )
  })

  it('returns formatted summaries using the medium size tier', async () => {
    const ctx = fakeCtx({
      total: 1,
      totalHits: 1,
      hits: [
        {
          id: 1,
          user: 'alice',
          videos: { medium: { url: 'https://cdn.pixabay.com/video/medium.mp4' } },
        },
      ],
    })

    const result = await handleSearchVideos(ctx, {})

    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0]?.text ?? '[]') as Array<{ url: string }>
    expect(parsed[0]?.url).toBe('https://cdn.pixabay.com/video/medium.mp4')
  })

  it('returns isError:true when no videos match', async () => {
    const ctx = fakeCtx({ total: 0, totalHits: 0, hits: [] })

    const result = await handleSearchVideos(ctx, { query: 'zzznonexistentzzz' })

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toMatch(/no videos found/i)
  })
})

describe('handleGetVideo', () => {
  it('looks up the id via searchVideos and returns the full detail', async () => {
    const ctx = fakeCtx({
      total: 1,
      totalHits: 1,
      hits: [
        {
          id: 42,
          user: 'bob',
          videos: { large: { url: 'https://cdn.pixabay.com/video/large.mp4' } },
        },
      ],
    })

    const result = await handleGetVideo(ctx, { id: 42 })

    expect(ctx.client.searchVideos).toHaveBeenCalledWith({ id: 42 }, undefined)
    expect(result.isError).toBeUndefined()
    const parsed = JSON.parse(result.content[0]?.text ?? '{}') as {
      videos: { large: { url: string } }
    }
    expect(parsed.videos.large.url).toBe('https://cdn.pixabay.com/video/large.mp4')
  })

  it('returns isError:true when the id does not exist', async () => {
    const ctx = fakeCtx({ total: 0, totalHits: 0, hits: [] })

    const result = await handleGetVideo(ctx, { id: 999999 })

    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toMatch(/no video found with id 999999/i)
  })
})
