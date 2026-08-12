import { imageSearchResponseSchema, type ImageSearchResponse } from '../schemas/image.js'
import { videoSearchResponseSchema, type VideoSearchResponse } from '../schemas/video.js'
import { PixabayApiError } from './errors.js'

export type PixabayRequestParams = Record<string, string | number | boolean | string[] | undefined>

// Exactly two methods: Pixabay's id-lookup is a filter on the same search endpoint,
// not a distinct route (verified against pixabay.com/api/docs/), so there is no
// separate "get" method — callers pass `{ id }` through the same search call.
export interface PixabayClient {
  searchImages: (params: PixabayRequestParams) => Promise<ImageSearchResponse>
  searchVideos: (params: PixabayRequestParams) => Promise<VideoSearchResponse>
}

export interface PixabayClientConfig {
  apiKey: string
}

const IMAGES_ENDPOINT = 'https://pixabay.com/api/'
const VIDEOS_ENDPOINT = 'https://pixabay.com/api/videos/'

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

// Intentionally minimal: a single fetch attempt, no cache/retry/backoff/redaction yet
// — those are separate, explicitly-scoped sections layered onto this same interface.
export function createPixabayClient(config: PixabayClientConfig): PixabayClient {
  async function request(endpoint: string, params: PixabayRequestParams): Promise<unknown> {
    const url = buildUrl(endpoint, config.apiKey, params)
    const response = await fetch(url)
    if (!response.ok) {
      // Never include `url` here — it carries the `key` query param.
      const body = await response.text().catch(() => '')
      throw new PixabayApiError(response.status, body || response.statusText)
    }
    return response.json()
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
