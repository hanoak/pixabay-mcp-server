import { describe, expect, it } from 'vitest'
import {
  buildAttribution,
  formatImageDetail,
  formatImageSummary,
  formatVideoDetail,
  formatVideoSummary,
} from '../../src/tools/format.js'
import type { Image } from '../../src/schemas/image.js'
import type { Video } from '../../src/schemas/video.js'

const image: Image = {
  id: 195893,
  pageURL: 'https://pixabay.com/en/blossom-bloom-flower-195893/',
  type: 'photo',
  tags: 'blossom, bloom, flower',
  previewURL: 'https://cdn.pixabay.com/photo/preview.jpg',
  webformatURL: 'https://cdn.pixabay.com/photo/webformat.jpg',
  largeImageURL: 'https://cdn.pixabay.com/photo/large.jpg',
  fullHDURL: null,
  imageURL: null,
  imageWidth: 4000,
  imageHeight: 3000,
  user: 'Josch13',
  user_id: 27,
  userImageURL: 'https://cdn.pixabay.com/user/avatar.jpg',
}

const video: Video = {
  id: 125,
  pageURL: 'https://pixabay.com/videos/id-125/',
  type: 'film',
  tags: 'ocean, waves',
  duration: 20,
  videos: {
    large: { url: 'https://cdn.pixabay.com/video/large.mp4', width: 1920, height: 1080, size: 1 },
    medium: {
      url: 'https://cdn.pixabay.com/video/medium.mp4',
      width: 1280,
      height: 720,
      size: 1,
    },
    small: { url: 'https://cdn.pixabay.com/video/small.mp4', width: 960, height: 540, size: 1 },
    tiny: { url: 'https://cdn.pixabay.com/video/tiny.mp4', width: 640, height: 360, size: 1 },
  },
  user: 'Coverr-Free-Footage',
  user_id: 1281706,
  userImageURL: null,
}

describe('buildAttribution', () => {
  it('credits the user when present', () => {
    expect(buildAttribution('Josch13')).toBe('by Josch13 via Pixabay')
  })

  it('falls back gracefully when the user is missing', () => {
    expect(buildAttribution(null)).toBe('via Pixabay')
    expect(buildAttribution(undefined)).toBe('via Pixabay')
  })
})

describe('formatImageSummary', () => {
  it('drops vanity metrics and returns exactly one default URL tier', () => {
    const summary = formatImageSummary(image)
    expect(summary).toEqual({
      id: 195893,
      pageURL: image.pageURL,
      type: 'photo',
      tags: image.tags,
      url: image.webformatURL,
      width: 4000,
      height: 3000,
      user: 'Josch13',
      attribution: 'by Josch13 via Pixabay',
    })
    expect(summary).not.toHaveProperty('views')
    expect(summary).not.toHaveProperty('largeImageURL')
  })
})

describe('formatImageDetail', () => {
  it('returns every size tier Pixabay provided', () => {
    const detail = formatImageDetail(image)
    expect(detail.previewURL).toBe(image.previewURL)
    expect(detail.webformatURL).toBe(image.webformatURL)
    expect(detail.largeImageURL).toBe(image.largeImageURL)
    expect(detail.fullHDURL).toBeNull()
  })
})

describe('formatVideoSummary', () => {
  it('returns the medium tier as the default', () => {
    const summary = formatVideoSummary(video)
    expect(summary.url).toBe('https://cdn.pixabay.com/video/medium.mp4')
    expect(summary.width).toBe(1280)
    expect(summary.height).toBe(720)
    expect(summary.duration).toBe(20)
    expect(summary.attribution).toBe('by Coverr-Free-Footage via Pixabay')
  })
})

describe('formatVideoDetail', () => {
  it('returns all four size tiers', () => {
    const detail = formatVideoDetail(video)
    expect(detail.videos?.tiny?.url).toBe('https://cdn.pixabay.com/video/tiny.mp4')
    expect(detail.videos?.small?.url).toBe('https://cdn.pixabay.com/video/small.mp4')
    expect(detail.videos?.medium?.url).toBe('https://cdn.pixabay.com/video/medium.mp4')
    expect(detail.videos?.large?.url).toBe('https://cdn.pixabay.com/video/large.mp4')
  })
})
