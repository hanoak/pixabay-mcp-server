import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildUrl,
  createPixabayClient,
  type PixabayClientConfig,
} from '../../src/pixabay/client.js'
import { PixabayApiError } from '../../src/pixabay/errors.js'
import { createCache } from '../../src/lib/cache.js'
import { createRedactor } from '../../src/lib/redact.js'
import type { Logger } from '../../src/lib/logger.js'

function fakeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function makeClient(overrides: Partial<PixabayClientConfig> = {}) {
  const apiKey = overrides.apiKey ?? 'secret-key'
  const logger = overrides.logger ?? fakeLogger()
  const config: PixabayClientConfig = {
    apiKey,
    cache: overrides.cache ?? createCache(),
    logger,
    redactor: overrides.redactor ?? createRedactor(apiKey),
  }
  return { client: createPixabayClient(config), logger, config }
}

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

    const { client } = makeClient()
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

    const { client } = makeClient()
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

    const { client } = makeClient({ apiKey: 'super-secret-key' })

    await expect(client.searchImages({})).rejects.toMatchObject({
      status: 400,
      message: "Bad Request. Missing parameter 'q'.",
    })
    await expect(client.searchImages({})).rejects.toBeInstanceOf(PixabayApiError)
    await expect(client.searchImages({})).rejects.not.toMatchObject({
      message: expect.stringContaining('super-secret-key'),
    })
  })

  it('serves a repeated query from cache without calling fetch again', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total: 1, totalHits: 1, hits: [{ id: 1 }] }), {
        status: 200,
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { client, logger } = makeClient()
    await client.searchImages({ q: 'cats' })
    const result = await client.searchImages({ q: 'cats' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.hits).toEqual([{ id: 1 }])
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('cache hit'))
  })

  it('does not cache an error response', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        () => new Response('Bad Request', { status: 400, statusText: 'Bad Request' }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { client } = makeClient()
    await expect(client.searchImages({ q: 'cats' })).rejects.toBeInstanceOf(PixabayApiError)
    await expect(client.searchImages({ q: 'cats' })).rejects.toBeInstanceOf(PixabayApiError)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('logs the rate-limit-remaining header on every response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ total: 0, totalHits: 0, hits: [] }), {
        status: 200,
        headers: { 'X-RateLimit-Remaining': '42' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { client, logger } = makeClient()
    await client.searchImages({ q: 'cats' })

    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('42'))
  })

  it('backs off using X-RateLimit-Reset and retries exactly once on 429', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('API rate limit exceeded', {
          status: 429,
          headers: { 'X-RateLimit-Reset': '0' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ total: 1, totalHits: 1, hits: [{ id: 1 }] }), {
          status: 200,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const { client, logger } = makeClient()
    const result = await client.searchImages({ q: 'cats' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result.hits).toEqual([{ id: 1 }])
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('backing off'))
  })

  it('does not retry a 429 with no X-RateLimit-Reset header (fails fast, never guesses)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('API rate limit exceeded', { status: 429 }))
    vi.stubGlobal('fetch', fetchMock)

    const { client } = makeClient()

    await expect(client.searchImages({ q: 'cats' })).rejects.toMatchObject({ status: 429 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never retries more than once, even if the retry also 429s', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('API rate limit exceeded', {
        status: 429,
        headers: { 'X-RateLimit-Reset': '0' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { client } = makeClient()

    await expect(client.searchImages({ q: 'cats' })).rejects.toMatchObject({ status: 429 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('redacts the key from a raw network error thrown by fetch() itself', async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      // Simulates undici embedding the full request URL (key included) in a
      // connection-failure message, as it sometimes does.
      throw new Error(
        'fetch failed: connect ECONNREFUSED https://pixabay.com/api/?key=super-secret-key&q=cats',
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const { client } = makeClient({ apiKey: 'super-secret-key' })

    await expect(client.searchImages({ q: 'cats' })).rejects.toMatchObject({
      message: expect.not.stringContaining('super-secret-key'),
    })
    await expect(client.searchImages({ q: 'cats' })).rejects.toMatchObject({
      message: expect.stringContaining('[REDACTED]'),
    })
  })
})
