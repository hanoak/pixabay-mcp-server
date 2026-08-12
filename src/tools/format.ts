import type { Image } from '../schemas/image.js'
import type { Video, VideoVariant } from '../schemas/video.js'

// Every formatter below passes Pixabay CDN URLs straight through, unmodified — this is
// a deliberate reading of "ephemeral conversational display" as distinct from
// Pixabay's "permanent hotlinking in an app" restriction, which is a gray area, not a
// settled legal conclusion. See README's "Image & Video URLs" section. Revisit if
// Pixabay ever clarifies the term.

type Nullish<T> = T | null | undefined

export function buildAttribution(user: Nullish<string>): string {
  return user ? `by ${user} via Pixabay` : 'via Pixabay'
}

export interface ImageSummary {
  id: number
  pageURL?: Nullish<string>
  type?: Nullish<string>
  tags?: Nullish<string>
  url?: Nullish<string>
  width?: Nullish<number>
  height?: Nullish<number>
  user?: Nullish<string>
  attribution: string
}

// Search results: token-efficient — drops vanity metrics (views/downloads/likes/
// comments) and returns exactly one balanced default URL tier. Call
// pixabay_get_image with the id for the full set of size tiers.
export function formatImageSummary(image: Image): ImageSummary {
  return {
    id: image.id,
    pageURL: image.pageURL,
    type: image.type,
    tags: image.tags,
    url: image.webformatURL,
    width: image.imageWidth,
    height: image.imageHeight,
    user: image.user,
    attribution: buildAttribution(image.user),
  }
}

export interface ImageDetail {
  id: number
  pageURL?: Nullish<string>
  type?: Nullish<string>
  tags?: Nullish<string>
  previewURL?: Nullish<string>
  webformatURL?: Nullish<string>
  largeImageURL?: Nullish<string>
  fullHDURL?: Nullish<string>
  width?: Nullish<number>
  height?: Nullish<number>
  user?: Nullish<string>
  attribution: string
}

// Single-item lookup: returns every size tier Pixabay provided for this item, so the
// caller can pick what fits (thumbnail vs. full display) instead of always getting
// the largest asset.
export function formatImageDetail(image: Image): ImageDetail {
  return {
    id: image.id,
    pageURL: image.pageURL,
    type: image.type,
    tags: image.tags,
    previewURL: image.previewURL,
    webformatURL: image.webformatURL,
    largeImageURL: image.largeImageURL,
    fullHDURL: image.fullHDURL,
    width: image.imageWidth,
    height: image.imageHeight,
    user: image.user,
    attribution: buildAttribution(image.user),
  }
}

export interface VideoSummary {
  id: number
  pageURL?: Nullish<string>
  type?: Nullish<string>
  tags?: Nullish<string>
  duration?: Nullish<number>
  url?: Nullish<string>
  width?: Nullish<number>
  height?: Nullish<number>
  user?: Nullish<string>
  attribution: string
}

export function formatVideoSummary(video: Video): VideoSummary {
  const medium = video.videos?.medium
  return {
    id: video.id,
    pageURL: video.pageURL,
    type: video.type,
    tags: video.tags,
    duration: video.duration,
    url: medium?.url,
    width: medium?.width,
    height: medium?.height,
    user: video.user,
    attribution: buildAttribution(video.user),
  }
}

export interface VideoDetail {
  id: number
  pageURL?: Nullish<string>
  type?: Nullish<string>
  tags?: Nullish<string>
  duration?: Nullish<number>
  videos?: Nullish<{
    tiny?: Nullish<VideoVariant>
    small?: Nullish<VideoVariant>
    medium?: Nullish<VideoVariant>
    large?: Nullish<VideoVariant>
  }>
  user?: Nullish<string>
  attribution: string
}

export function formatVideoDetail(video: Video): VideoDetail {
  return {
    id: video.id,
    pageURL: video.pageURL,
    type: video.type,
    tags: video.tags,
    duration: video.duration,
    videos: video.videos,
    user: video.user,
    attribution: buildAttribution(video.user),
  }
}
