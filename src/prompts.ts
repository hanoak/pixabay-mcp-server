import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const MEDIA_TYPE_VALUES = ['images', 'videos', 'both'] as const

export function buildFindMediaPrompt(
  subject: string,
  mediaType: (typeof MEDIA_TYPE_VALUES)[number],
): string {
  const steps: string[] = []
  if (mediaType === 'images' || mediaType === 'both') {
    steps.push(`Call pixabay_search_images with query: "${subject}".`)
  }
  if (mediaType === 'videos' || mediaType === 'both') {
    steps.push(`Call pixabay_search_videos with query: "${subject}".`)
  }

  return [
    `Find Pixabay media for "${subject}".`,
    '',
    ...steps,
    '',
    'Present the best match(es) to the user along with their courtesy attribution',
    '("by {user} via Pixabay") linked to pageURL. If nothing suitable comes back, try a',
    'broader query or fewer filters before giving up.',
  ].join('\n')
}

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'find_media',
    {
      title: 'Find Pixabay media',
      description: 'Search Pixabay for images and/or videos matching a subject.',
      argsSchema: {
        subject: z.string().min(1).describe('What to search for, e.g. "mountain sunrise".'),
        media_type: z
          .enum(MEDIA_TYPE_VALUES)
          .optional()
          .describe('Which media type(s) to search. Defaults to "both".'),
      },
    },
    ({ subject, media_type }) => ({
      messages: [
        {
          role: 'user',
          content: { type: 'text', text: buildFindMediaPrompt(subject, media_type ?? 'both') },
        },
      ],
    }),
  )
}
