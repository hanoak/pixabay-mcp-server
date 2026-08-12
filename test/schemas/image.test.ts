import { describe, expect, it } from 'vitest'
import { imageSchema, imageSearchResponseSchema } from '../../src/schemas/image.js'

describe('imageSchema', () => {
  it('requires only id', () => {
    const result = imageSchema.safeParse({ id: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects a payload missing id', () => {
    const result = imageSchema.safeParse({ pageURL: 'https://pixabay.com/photos/1' })
    expect(result.success).toBe(false)
  })

  it('tolerates a full realistic image payload', () => {
    const result = imageSchema.safeParse({
      id: 195893,
      pageURL: 'https://pixabay.com/en/blossom-bloom-flower-195893/',
      type: 'photo',
      tags: 'blossom, bloom, flower',
      previewURL: 'https://cdn.pixabay.com/photo/preview.jpg',
      webformatURL: 'https://cdn.pixabay.com/photo/webformat.jpg',
      largeImageURL: 'https://cdn.pixabay.com/photo/large.jpg',
      imageWidth: 4000,
      imageHeight: 3000,
      user: 'Josch13',
      user_id: 27,
      userImageURL: 'https://cdn.pixabay.com/user/avatar.jpg',
      views: 7671,
      downloads: 6439,
      likes: 5,
      comments: 2,
    })
    expect(result.success).toBe(true)
  })

  it('degrades gracefully when an upstream field is missing or renamed', () => {
    const result = imageSchema.safeParse({ id: 42, someNewUpstreamField: 'unexpected' })
    expect(result.success).toBe(true)
  })
})

describe('imageSearchResponseSchema', () => {
  it('defaults hits to an empty array when missing', () => {
    const result = imageSearchResponseSchema.parse({ total: 0, totalHits: 0 })
    expect(result.hits).toEqual([])
  })

  it('parses a list of hits', () => {
    const result = imageSearchResponseSchema.parse({
      total: 1,
      totalHits: 1,
      hits: [{ id: 1 }],
    })
    expect(result.hits).toHaveLength(1)
  })
})
