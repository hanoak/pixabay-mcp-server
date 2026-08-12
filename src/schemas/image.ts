import { z } from 'zod'
import { searchResponseEnvelopeSchema } from './envelope.js'

// Lenient by design: only `id` is required. Every other field is optional/nullable so
// an upstream field add/rename/reorder degrades gracefully instead of breaking a tool.
export const imageSchema = z.object({
  id: z.number(),
  pageURL: z.string().nullish(),
  type: z.string().nullish(),
  tags: z.string().nullish(),
  previewURL: z.string().nullish(),
  webformatURL: z.string().nullish(),
  largeImageURL: z.string().nullish(),
  // fullHDURL/imageURL require Pixabay's "full access" approval tier — may be absent.
  fullHDURL: z.string().nullish(),
  imageURL: z.string().nullish(),
  imageWidth: z.number().nullish(),
  imageHeight: z.number().nullish(),
  user: z.string().nullish(),
  user_id: z.number().nullish(),
  userImageURL: z.string().nullish(),
})

export type Image = z.infer<typeof imageSchema>

export const imageSearchResponseSchema = searchResponseEnvelopeSchema.extend({
  hits: z.array(imageSchema).optional().default([]),
})

export type ImageSearchResponse = z.infer<typeof imageSearchResponseSchema>
