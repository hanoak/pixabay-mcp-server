import { buildCacheKey, type Cache, type CacheKeyParams } from '../lib/cache.js'
import type { Logger } from '../lib/logger.js'
import type { Redactor } from '../lib/redact.js'
import { parseResponse } from '../schemas/parse.js'
import { imageSearchResponseSchema, type ImageSearchResponse } from '../schemas/image.js'
import { videoSearchResponseSchema, type VideoSearchResponse } from '../schemas/video.js'
import { createPixabayApiError } from './errors.js'

export type PixabayRequestParams = CacheKeyParams

// Exactly two methods: Pixabay's id-lookup is a filter on the same search endpoint,
// not a distinct route (verified against pixabay.com/api/docs/), so there is no
// separate "get" method — callers pass `{ id }` through the same search call. `signal`
// is optional and unused by any caller yet — it's here so a future MCP request-
// cancellation signal (§11) has somewhere to plug in without changing this interface.
export interface PixabayClient {
  searchImages: (params: PixabayRequestParams, signal?: AbortSignal) => Promise<ImageSearchResponse>
  searchVideos: (params: PixabayRequestParams, signal?: AbortSignal) => Promise<VideoSearchResponse>
}

export interface PixabayClientConfig {
  apiKey: string
  cache: Cache
  logger: Logger
  redactor: Redactor
  timeoutMs?: number
}

const IMAGES_ENDPOINT = 'https://pixabay.com/api/'
const VIDEOS_ENDPOINT = 'https://pixabay.com/api/videos/'

// Pixabay's documented rate-limit window — a ceiling on how long we'll ever wait,
// in case a future X-RateLimit-Reset value is unexpectedly large.
const MAX_BACKOFF_SECONDS = 60

// A single fixed delay before the one considered retry on a 5xx — there's no
// server-provided guidance here (unlike 429's X-RateLimit-Reset), so this is a
// short, deliberately conservative wait rather than an unbounded/exponential scheme.
const SERVER_ERROR_RETRY_DELAY_MS = 500

const DEFAULT_TIMEOUT_MS = 10_000

// Single choke point for request-URL construction, per CLAUDE.md, since Pixabay only
// accepts the API key as a query param. The URL built here is only ever handed to
// fetch() — it must never be logged or included in an error message; see `attempt`
// and the redactor it wraps errors with below.
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createPixabayClient(config: PixabayClientConfig): PixabayClient {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS

  async function attempt(
    endpoint: string,
    params: PixabayRequestParams,
    signal?: AbortSignal,
  ): Promise<Response> {
    const url = buildUrl(endpoint, config.apiKey, params)
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const combinedSignal = signal ? AbortSignal.any([timeoutSignal, signal]) : timeoutSignal
    try {
      return await fetch(url, { signal: combinedSignal })
    } catch (error) {
      // fetch() itself can throw with the request URL embedded in its message (e.g.
      // on a DNS/connection failure) — the URL carries the `key` query param, so
      // redact before this can ever reach a log line or an isError tool result.
      // Deliberately not attaching `cause: error` — that would smuggle the raw,
      // unredacted message right back in for anything that inspects it.
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      const message = isTimeout
        ? `Pixabay request timed out after ${timeoutMs / 1000}s`
        : error instanceof Error
          ? error.message
          : String(error)
      // eslint-disable-next-line preserve-caught-error
      throw new Error(config.redactor.redact(message))
    }
  }

  // Every outbound GET routes through the cache (Pixabay's terms require 24h
  // caching). Exactly one considered retry, never a blind or looping one: on 429,
  // back off using X-RateLimit-Reset (only if Pixabay actually told us how long to
  // wait — otherwise fail fast rather than guess); on 5xx, back off a short fixed
  // delay since there's no equivalent server-provided guidance.
  async function request(
    endpoint: string,
    params: PixabayRequestParams,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const cacheKey = buildCacheKey(endpoint, params)
    const cached = config.cache.get<unknown>(cacheKey)
    if (cached !== undefined) {
      config.logger.debug(`cache hit for ${endpoint}`)
      return cached
    }

    let response = await attempt(endpoint, params, signal)
    logRateLimitRemaining(config.logger, response)

    if (response.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(response)
      if (retryAfterSeconds !== undefined) {
        config.logger.warn(
          `Pixabay rate limit hit — backing off ${retryAfterSeconds}s before one retry`,
        )
        await wait(retryAfterSeconds * 1000)
        response = await attempt(endpoint, params, signal)
        logRateLimitRemaining(config.logger, response)
      }
    } else if (response.status >= 500) {
      config.logger.warn(
        `Pixabay returned ${response.status} — retrying once after ${SERVER_ERROR_RETRY_DELAY_MS}ms`,
      )
      await wait(SERVER_ERROR_RETRY_DELAY_MS)
      response = await attempt(endpoint, params, signal)
      logRateLimitRemaining(config.logger, response)
    }

    if (!response.ok) {
      // Never include `url` here — it carries the `key` query param. Redacted too,
      // as defense-in-depth in case Pixabay's error body ever echoes back a param.
      const body = await response.text().catch(() => '')
      throw createPixabayApiError(
        response.status,
        config.redactor.redact(body || response.statusText),
      )
    }

    const json = await response.json()
    config.cache.set(cacheKey, json)
    return json
  }

  return {
    async searchImages(params, signal) {
      const json = await request(IMAGES_ENDPOINT, params, signal)
      return parseResponse(imageSearchResponseSchema, json, 'image search', config.logger)
    },
    async searchVideos(params, signal) {
      const json = await request(VIDEOS_ENDPOINT, params, signal)
      return parseResponse(videoSearchResponseSchema, json, 'video search', config.logger)
    },
  }
}
