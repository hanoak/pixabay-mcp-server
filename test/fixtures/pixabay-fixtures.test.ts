import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { imageSearchResponseSchema } from '../../src/schemas/image.js'
import { videoSearchResponseSchema } from '../../src/schemas/video.js'
import {
  formatImageDetail,
  formatImageSummary,
  formatVideoDetail,
  formatVideoSummary,
} from '../../src/tools/format.js'

// These fixtures are Pixabay's own documented example responses from
// pixabay.com/api/docs/ (one hit each, images and videos) — not a response this
// project captured from a live API call, since no PIXABAY_API_KEY is available in
// this dev/CI environment. They're still genuine, Pixabay-sourced field shapes
// rather than hand-invented test data, so they're a meaningful check that our
// lenient schemas parse Pixabay's real field names/nesting correctly. Re-validate
// against an actual live response if you have a key and notice a mismatch.

function loadFixture(name: string): unknown {
  const path = fileURLToPath(new URL(name, import.meta.url))
  return JSON.parse(readFileSync(path, 'utf-8'))
}

describe('image search response fixture (Pixabay docs example)', () => {
  const raw = loadFixture('pixabay-image-response.json')

  it('parses against imageSearchResponseSchema', () => {
    const result = imageSearchResponseSchema.safeParse(raw)
    expect(result.success).toBe(true)
  })

  it('formats into a summary and a detail without losing the documented fields', () => {
    const parsed = imageSearchResponseSchema.parse(raw)
    const [image] = parsed.hits
    expect(image).toBeDefined()

    const summary = formatImageSummary(image!)
    expect(summary.attribution).toBe('by Josch13 via Pixabay')
    expect(summary.url).toBe(image!.webformatURL)

    const detail = formatImageDetail(image!)
    expect(detail.fullHDURL).toBe(image!.fullHDURL)
    expect(detail.largeImageURL).toBe(image!.largeImageURL)
  })
})

describe('video search response fixture (Pixabay docs example)', () => {
  const raw = loadFixture('pixabay-video-response.json')

  it('parses against videoSearchResponseSchema', () => {
    const result = videoSearchResponseSchema.safeParse(raw)
    expect(result.success).toBe(true)
  })

  it('formats into a summary and a detail without losing the documented fields', () => {
    const parsed = videoSearchResponseSchema.parse(raw)
    const [video] = parsed.hits
    expect(video).toBeDefined()

    const summary = formatVideoSummary(video!)
    expect(summary.attribution).toBe('by Coverr-Free-Footage via Pixabay')
    expect(summary.url).toBe(video!.videos?.medium?.url)

    const detail = formatVideoDetail(video!)
    expect(detail.videos?.large?.url).toBe(video!.videos?.large?.url)
    expect(detail.videos?.tiny?.url).toBe(video!.videos?.tiny?.url)
  })
})
