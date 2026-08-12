import { describe, expect, it } from 'vitest'
import { videoSchema, videoSearchResponseSchema } from '../../src/schemas/video.js'

describe('videoSchema', () => {
  it('requires only id', () => {
    const result = videoSchema.safeParse({ id: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects a payload missing id', () => {
    const result = videoSchema.safeParse({ tags: 'ocean, waves' })
    expect(result.success).toBe(false)
  })

  it('tolerates a full realistic video payload with nested size tiers', () => {
    const result = videoSchema.safeParse({
      id: 125,
      pageURL: 'https://pixabay.com/videos/id-125/',
      type: 'film',
      tags: 'ocean, waves',
      duration: 20,
      videos: {
        large: {
          url: 'https://cdn.pixabay.com/video/large.mp4',
          width: 1920,
          height: 1080,
          size: 6615235,
        },
        medium: {
          url: 'https://cdn.pixabay.com/video/medium.mp4',
          width: 1280,
          height: 720,
          size: 3562500,
        },
        small: {
          url: 'https://cdn.pixabay.com/video/small.mp4',
          width: 960,
          height: 540,
          size: 2384345,
        },
        tiny: {
          url: 'https://cdn.pixabay.com/video/tiny.mp4',
          width: 640,
          height: 360,
          size: 1385836,
        },
      },
      user: 'Coverr-Free-Footage',
      user_id: 1281706,
      views: 1000,
      downloads: 500,
    })
    expect(result.success).toBe(true)
  })

  it('degrades gracefully when videos or its variants are missing', () => {
    const result = videoSchema.safeParse({ id: 2, videos: { medium: null } })
    expect(result.success).toBe(true)
  })
})

describe('videoSearchResponseSchema', () => {
  it('defaults hits to an empty array when missing', () => {
    const result = videoSearchResponseSchema.parse({ total: 0, totalHits: 0 })
    expect(result.hits).toEqual([])
  })
})
