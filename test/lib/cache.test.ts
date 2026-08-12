import { describe, expect, it } from 'vitest'
import { buildCacheKey, createCache } from '../../src/lib/cache.js'

describe('createCache', () => {
  it('returns undefined for a missing key', () => {
    const cache = createCache()
    expect(cache.get('missing')).toBeUndefined()
  })

  it('returns a stored value before it expires', () => {
    let time = 1000
    const cache = createCache(() => time)

    cache.set('key', { hits: [1, 2, 3] })
    time += 23 * 60 * 60 * 1000 // 23h later — still within the 24h TTL

    expect(cache.get('key')).toEqual({ hits: [1, 2, 3] })
  })

  it('expires an entry after 24 hours', () => {
    let time = 1000
    const cache = createCache(() => time)

    cache.set('key', 'value')
    time += 24 * 60 * 60 * 1000 // exactly 24h later — expired

    expect(cache.get('key')).toBeUndefined()
  })
})

describe('buildCacheKey', () => {
  it('never includes the key query param', () => {
    const cacheKey = buildCacheKey('https://pixabay.com/api/', {
      key: 'super-secret-key',
      q: 'cats',
    })

    expect(cacheKey).not.toContain('super-secret-key')
    expect(cacheKey).not.toContain('key=')
  })

  it('produces the same key regardless of param order', () => {
    const a = buildCacheKey('https://pixabay.com/api/', { q: 'cats', page: 2, per_page: 20 })
    const b = buildCacheKey('https://pixabay.com/api/', { per_page: 20, page: 2, q: 'cats' })

    expect(a).toBe(b)
  })

  it('produces different keys for different params or endpoints', () => {
    const images = buildCacheKey('https://pixabay.com/api/', { q: 'cats' })
    const videos = buildCacheKey('https://pixabay.com/api/videos/', { q: 'cats' })
    const dogs = buildCacheKey('https://pixabay.com/api/', { q: 'dogs' })

    expect(images).not.toBe(videos)
    expect(images).not.toBe(dogs)
  })

  it('skips undefined params so an omitted filter does not fragment the cache', () => {
    const a = buildCacheKey('https://pixabay.com/api/', { q: 'cats', category: undefined })
    const b = buildCacheKey('https://pixabay.com/api/', { q: 'cats' })

    expect(a).toBe(b)
  })
})
