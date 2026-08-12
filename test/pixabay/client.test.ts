import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildUrl, createPixabayClient } from '../../src/pixabay/client.js'
import { PixabayApiError } from '../../src/pixabay/errors.js'

describe('buildUrl', () => {
  it('sets the key query param', () => {
    const url = buildUrl('https://pixabay.com/api/', 'secret-key', {})
    expect(url.searchParams.get('key')).toBe('secret-key')
  })

  it('serializes primitive and array params, skipping undefined', () => {
    const url = buildUrl('https://pixabay.com/api/', 'k', {
      q: 'cats',
      page: 2,
      safesearch: true,
      colors: ['red', 'blue'],
      category: undefined,
    })
    expect(url.searchParams.get('q')).toBe('cats')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('safesearch')).toBe('true')
    expect(url.searchParams.get('colors')).toBe('red,blue')
    expect(url.searchParams.has('category')).toBe(false)
  })
})

describe('createPixabayClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('searchImages fetches the images endpoint and parses the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total: 1, totalHits: 1, hits: [{ id: 1 }] }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPixabayClient({ apiKey: 'secret-key' })
    const result = await client.searchImages({ q: 'cats' })

    expect(result.hits).toEqual([{ id: 1 }])
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestedUrl.startsWith('https://pixabay.com/api/?')).toBe(true)
  })

  it('searchVideos fetches the videos endpoint and parses the response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total: 1, totalHits: 1, hits: [{ id: 2 }] }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPixabayClient({ apiKey: 'secret-key' })
    const result = await client.searchVideos({ q: 'ocean' })

    expect(result.hits).toEqual([{ id: 2 }])
    const requestedUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(requestedUrl.startsWith('https://pixabay.com/api/videos/?')).toBe(true)
  })

  it('throws a PixabayApiError with the status and body on a non-ok response, never the URL', async () => {
    // A fresh Response per call — a Response body can only be read once.
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Response("Bad Request. Missing parameter 'q'.", {
          status: 400,
          statusText: 'Bad Request',
        }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createPixabayClient({ apiKey: 'super-secret-key' })

    await expect(client.searchImages({})).rejects.toMatchObject({
      status: 400,
      message: "Bad Request. Missing parameter 'q'.",
    })
    await expect(client.searchImages({})).rejects.toBeInstanceOf(PixabayApiError)
    await expect(client.searchImages({})).rejects.not.toMatchObject({
      message: expect.stringContaining('super-secret-key'),
    })
  })
})
