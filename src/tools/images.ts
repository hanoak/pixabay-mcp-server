import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { PixabayClient } from '../pixabay/client.js'
import { formatImageDetail, formatImageSummary } from './format.js'
import { toErrorResult, toSuccessResult, type ToolResult } from './result.js'
import { CATEGORY_VALUES, ORDER_VALUES } from './shared.js'

export interface ToolContext {
  client: PixabayClient
}

const IMAGE_TYPE_VALUES = ['all', 'photo', 'illustration', 'vector'] as const
const ORIENTATION_VALUES = ['all', 'horizontal', 'vertical'] as const
const COLOR_VALUES = [
  'grayscale',
  'transparent',
  'red',
  'orange',
  'yellow',
  'green',
  'turquoise',
  'blue',
  'lilac',
  'pink',
  'white',
  'gray',
  'black',
  'brown',
] as const

// Only `safesearch` carries a schema default — it deliberately overrides Pixabay's own
// `false` default per the compliance requirement. Every other field stays optional and
// unset so an omitted param falls through to Pixabay's own documented default instead
// of duplicating it here (and risking drift if Pixabay ever changes it).
export const searchImagesInputShape = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Search term (max 100 characters). Omit to browse a default set of images.'),
  lang: z
    .string()
    .optional()
    .describe('ISO 639-1 language code for the search term. Defaults to "en".'),
  image_type: z
    .enum(IMAGE_TYPE_VALUES)
    .optional()
    .describe('Filter by image type. Defaults to "all".'),
  orientation: z
    .enum(ORIENTATION_VALUES)
    .optional()
    .describe('Filter by image orientation. Defaults to "all".'),
  category: z.enum(CATEGORY_VALUES).optional().describe('Filter by content category.'),
  colors: z.array(z.enum(COLOR_VALUES)).optional().describe('Filter by dominant color(s).'),
  min_width: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum image width in pixels. Defaults to 0 (no minimum).'),
  min_height: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum image height in pixels. Defaults to 0 (no minimum).'),
  editors_choice: z
    .boolean()
    .optional()
    .describe('Only return award-winning editors-choice images. Defaults to false.'),
  safesearch: z
    .boolean()
    .default(true)
    .describe(
      'Only return content suitable for all ages. Defaults to true here (Pixabay itself ' +
        'defaults to false) so this tool never surfaces explicit content unprompted.',
    ),
  order: z.enum(ORDER_VALUES).optional().describe('Sort order. Defaults to "popular".'),
  page: z.number().int().min(1).optional().describe('Page number. Defaults to 1.'),
  per_page: z
    .number()
    .int()
    .min(3)
    .max(200)
    .optional()
    .describe('Results per page, 3-200. Defaults to 20.'),
}

const searchImagesInputSchema = z.object(searchImagesInputShape)
export type SearchImagesInput = z.infer<typeof searchImagesInputSchema>

export const getImageInputShape = {
  id: z
    .number()
    .int()
    .positive()
    .describe('The Pixabay image id to retrieve, e.g. from a pixabay_search_images result.'),
}

const getImageInputSchema = z.object(getImageInputShape)
export type GetImageInput = z.infer<typeof getImageInputSchema>

export async function handleSearchImages(ctx: ToolContext, rawInput: unknown): Promise<ToolResult> {
  const input = searchImagesInputSchema.parse(rawInput)
  const response = await ctx.client.searchImages({
    q: input.query,
    lang: input.lang,
    image_type: input.image_type,
    orientation: input.orientation,
    category: input.category,
    colors: input.colors,
    min_width: input.min_width,
    min_height: input.min_height,
    editors_choice: input.editors_choice,
    safesearch: input.safesearch,
    order: input.order,
    page: input.page,
    per_page: input.per_page,
  })

  if (response.hits.length === 0) {
    return toErrorResult(
      'No images found matching your query. Try a broader search term or fewer filters.',
    )
  }

  return toSuccessResult(response.hits.map(formatImageSummary))
}

export async function handleGetImage(ctx: ToolContext, rawInput: unknown): Promise<ToolResult> {
  const input = getImageInputSchema.parse(rawInput)
  const response = await ctx.client.searchImages({ id: input.id })
  const image = response.hits[0]
  if (!image) {
    return toErrorResult(`No image found with id ${input.id}.`)
  }
  return toSuccessResult(formatImageDetail(image))
}

export function registerImageTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'pixabay_search_images',
    {
      title: 'Search Pixabay Images',
      description:
        "Search Pixabay's library of royalty-free images by keyword and filters. Returns a " +
        'token-efficient summary per match (one representative image URL plus metadata) — ' +
        'call pixabay_get_image with an id for the full set of size tiers.',
      inputSchema: searchImagesInputShape,
    },
    async (args) => handleSearchImages(ctx, args),
  )

  server.registerTool(
    'pixabay_get_image',
    {
      title: 'Get Pixabay Image',
      description:
        'Fetch a single Pixabay image by id (e.g. one returned from pixabay_search_images), ' +
        'including every size tier Pixabay provides for it.',
      inputSchema: getImageInputShape,
    },
    async (args) => handleGetImage(ctx, args),
  )
}
