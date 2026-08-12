import { buildCacheKey, type Cache, type CacheKeyParams } from '../lib/cache.js'
import type { Logger } from '../lib/logger.js'
import { imageSearchResponseSchema, type ImageSearchResponse } from '../schemas/image.js'
import { videoSearchResponseSchema, type VideoSearchResponse } from '../schemas/video.js'
import { PixabayApiError } from './errors.js'

export type PixabayRequestParams = CacheKeyParams

// Exactly two methods: Pixabay's id-lookup is a filter on the same search endpoint,
// not a distinct route (verified against pixabay.com/api/docs/), so there is no
// separate "get" method — callers pass `{ id }` through the same search call.
export interface PixabayClient {
  searchImages: (params: PixabayRequestParams) => Promise<ImageSearchResponse>
  searchVideos: (params: PixabayRequestParams) => Promise<VideoSearchResponse>
}

export interface PixabayClientConfig {
  apiKey: string
  cache: Cache
  logger: Logger
}

const IMAGES_ENDPOINT = 'https://pixabay.com/api/'
const VIDEOS_ENDPOINT = 'https://pixabay.com/api/videos/'

// Pixabay's documented rate-limit window — a ceiling on how long we'll ever wait,
// in case a future X-RateLimit-Reset value is unexpectedly large.
const MAX_BACKOFF_SECONDS = 60

// Single choke point for request-URL construction, per CLAUDE.md — this is where a
// future redactor hooks in, since Pixabay only accepts the API key as a query param.
export function buildUrl(endpoint: string, apiKey: string, params: PixabayRequestParams): URL {
  const url = new URL(endpoint)
  url.searchParams.set('key', apiKey)
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  return url
}

function logRateLimitRemaining(logger: Logger, response: Response): void {
  const remaining = response.headers.get('X-RateLimit-Remaining')
  if (remaining !== null) {
    logger.debug(`Pixabay rate limit remaining: ${remaining}`)
  }
}

function parseRetryAfterSeconds(response: Response): number | undefined {
  const reset = response.headers.get('X-RateLimit-Reset')
  if (reset === null) {
    return undefined
  }
  const seconds = Number(reset)
  if (!Number.isFinite(seconds) || seconds < 0) {
    return undefined
  }
  return Math.min(seconds, MAX_BACKOFF_SECONDS)
}

export function createPixabayClient(config: PixabayClientConfig): PixabayClient {
  async function attempt(endpoint: string, params: PixabayRequestParams): Promise<Response> {
    const url = buildUrl(endpoint, config.apiKey, params)
    return fetch(url)
  }

  // Every outbound GET routes through the cache (Pixabay's terms require 24h
  // caching). On 429, back off using X-RateLimit-Reset for exactly one considered
  // retry — never a blind or looping retry — and only if Pixabay actually told us
  // how long to wait; otherwise we fail fast rather than guess.
  async function request(endpoint: string, params: PixabayRequestParams): Promise<unknown> {
    const cacheKey = buildCacheKey(endpoint, params)
    const cached = config.cache.get<unknown>(cacheKey)
    if (cached !== undefined) {
      config.logger.debug(`cache hit for ${endpoint}`)
      return cached
    }

    let response = await attempt(endpoint, params)
    logRateLimitRemaining(config.logger, response)

    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(response)
      if (retryAfterSeconds !== undefined) {
        config.logger.warn(
          `Pixabay rate limit hit — backing off ${retryAfterSeconds}s before one retry`,
        )
        await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000))
        response = await attempt(endpoint, params)
        logRateLimitRemaining(config.logger, response)
      }
    }

    if (!response.ok) {
      // Never include `url` here — it carries the `key` query param.
      const body = await response.text().catch(() => '')
      throw new PixabayApiError(response.status, body || response.statusText)
    }

    const json = await response.json()
    config.cache.set(cacheKey, json)
    return json
  }

  return {
    async searchImages(params) {
      const json = await request(IMAGES_ENDPOINT, params)
      return imageSearchResponseSchema.parse(json)
    },
    async searchVideos(params) {
      const json = await request(VIDEOS_ENDPOINT, params)
      return videoSearchResponseSchema.parse(json)
    },
  }
}
