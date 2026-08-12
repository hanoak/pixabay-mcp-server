import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { formatVideoDetail, formatVideoSummary } from './format.js'
import { toErrorResult, toSuccessResult, type ToolResult } from './result.js'
import { CATEGORY_VALUES, ORDER_VALUES, type ToolContext } from './shared.js'

const VIDEO_TYPE_VALUES = ['all', 'film', 'animation'] as const

// Videos support category but not colors/orientation — confirmed against
// pixabay.com/api/docs/ (distinct from the images endpoint's parameter set).
export const searchVideosInputShape = {
  query: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe('Search term (max 100 characters). Omit to browse a default set of videos.'),
  lang: z
    .string()
    .optional()
    .describe('ISO 639-1 language code for the search term. Defaults to "en".'),
  video_type: z
    .enum(VIDEO_TYPE_VALUES)
    .optional()
    .describe('Filter by video type. Defaults to "all".'),
  category: z.enum(CATEGORY_VALUES).optional().describe('Filter by content category.'),
  min_width: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum video width in pixels. Defaults to 0 (no minimum).'),
  min_height: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Minimum video height in pixels. Defaults to 0 (no minimum).'),
  editors_choice: z
    .boolean()
    .optional()
    .describe('Only return award-winning editors-choice videos. Defaults to false.'),
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

const searchVideosInputSchema = z.object(searchVideosInputShape)
export type SearchVideosInput = z.infer<typeof searchVideosInputSchema>

export const getVideoInputShape = {
  id: z
    .number()
    .int()
    .positive()
    .describe('The Pixabay video id to retrieve, e.g. from a pixabay_search_videos result.'),
}

const getVideoInputSchema = z.object(getVideoInputShape)
export type GetVideoInput = z.infer<typeof getVideoInputSchema>

export async function handleSearchVideos(
  ctx: ToolContext,
  rawInput: unknown,
  signal?: AbortSignal,
): Promise<ToolResult> {
  const input = searchVideosInputSchema.parse(rawInput)
  const response = await ctx.client.searchVideos(
    {
      q: input.query,
      lang: input.lang,
      video_type: input.video_type,
      category: input.category,
      min_width: input.min_width,
      min_height: input.min_height,
      editors_choice: input.editors_choice,
      safesearch: input.safesearch,
      order: input.order,
      page: input.page,
      per_page: input.per_page,
    },
    signal,
  )

  if (response.hits.length === 0) {
    return toErrorResult(
      'No videos found matching your query. Try a broader search term or fewer filters.',
    )
  }

  return toSuccessResult(response.hits.map(formatVideoSummary))
}

export async function handleGetVideo(
  ctx: ToolContext,
  rawInput: unknown,
  signal?: AbortSignal,
): Promise<ToolResult> {
  const input = getVideoInputSchema.parse(rawInput)
  const response = await ctx.client.searchVideos({ id: input.id }, signal)
  const video = response.hits[0]
  if (!video) {
    return toErrorResult(`No video found with id ${input.id}.`)
  }
  return toSuccessResult(formatVideoDetail(video))
}

export function registerVideoTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'pixabay_search_videos',
    {
      title: 'Search Pixabay Videos',
      description:
        "Search Pixabay's library of royalty-free videos by keyword and filters. Returns a " +
        'token-efficient summary per match (one representative video URL plus metadata) — ' +
        'call pixabay_get_video with an id for the full set of size tiers.',
      inputSchema: searchVideosInputShape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args, extra) => handleSearchVideos(ctx, args, extra.signal),
  )

  server.registerTool(
    'pixabay_get_video',
    {
      title: 'Get Pixabay Video',
      description:
        'Fetch a single Pixabay video by id (e.g. one returned from pixabay_search_videos), ' +
        'including every size tier Pixabay provides for it.',
      inputSchema: getVideoInputShape,
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args, extra) => handleGetVideo(ctx, args, extra.signal),
  )
}
