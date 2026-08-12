import type { PixabayClient } from '../pixabay/client.js'

// Shared between images.ts and videos.ts — both search endpoints accept the same
// category and order values (verified against pixabay.com/api/docs/).

export interface ToolContext {
  client: PixabayClient
}

export const CATEGORY_VALUES = [
  'backgrounds',
  'fashion',
  'nature',
  'science',
  'education',
  'feelings',
  'health',
  'people',
  'religion',
  'places',
  'animals',
  'industry',
  'computer',
  'food',
  'sports',
  'transportation',
  'travel',
  'buildings',
  'business',
  'music',
] as const

export const ORDER_VALUES = ['popular', 'latest'] as const
