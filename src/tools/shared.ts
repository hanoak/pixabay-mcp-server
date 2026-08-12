import type { PixabayClient } from '../pixabay/client.js'

// Shared between images.ts and videos.ts — both search endpoints accept the same
// category and order values (verified against pixabay.com/api/docs/).

export interface ToolContext {
  client: PixabayClient
  // Strips the API key from any text before it reaches a tool's isError result —
  // a second, mandatory safety net alongside pixabay/client.ts's own source-level
  // redaction, not a substitute for it.
  redact: (input: string) => string
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
