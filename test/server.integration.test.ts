import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it, vi } from 'vitest'
import { createServer } from '../src/server.js'
import type { ToolContext } from '../src/tools/shared.js'
import type { ImageSearchResponse } from '../src/schemas/image.js'
import type { VideoSearchResponse } from '../src/schemas/video.js'

interface TextContentLike {
  type: string
  text?: unknown
}

function firstText(content: unknown): string {
  const first = Array.isArray(content) ? (content[0] as TextContentLike | undefined) : undefined
  if (first && first.type === 'text' && typeof first.text === 'string') {
    return first.text
  }
  throw new Error(`expected text content, got: ${JSON.stringify(content)}`)
}

function fakeCtx(): ToolContext {
  const imageResponse: ImageSearchResponse = {
    total: 1,
    totalHits: 1,
    hits: [{ id: 1, user: 'alice', webformatURL: 'https://cdn.pixabay.com/x.jpg' }],
  }
  const videoResponse: VideoSearchResponse = {
    total: 1,
    totalHits: 1,
    hits: [
      {
        id: 2,
        user: 'bob',
        videos: { medium: { url: 'https://cdn.pixabay.com/x.mp4' } },
      },
    ],
  }
  return {
    client: {
      searchImages: vi.fn().mockResolvedValue(imageResponse),
      searchVideos: vi.fn().mockResolvedValue(videoResponse),
    },
  }
}

// A real MCP Client talking to a real Server over an in-memory transport — the
// only thing faked is the PixabayClient, per this project's DI-over-network-mocking
// testing standard (zero real HTTP calls, but a genuine protocol handshake).
async function connectedClient(ctx: ToolContext): Promise<Client> {
  const server = createServer(ctx)
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return client
}

describe('MCP server integration (in-memory Client<->Server)', () => {
  it('completes the handshake and lists all 4 tools', async () => {
    const client = await connectedClient(fakeCtx())

    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'pixabay_get_image',
      'pixabay_get_video',
      'pixabay_search_images',
      'pixabay_search_videos',
    ])
  })

  it('calls pixabay_search_images over the transport and returns a real result', async () => {
    const ctx = fakeCtx()
    const client = await connectedClient(ctx)

    const result = await client.callTool({
      name: 'pixabay_search_images',
      arguments: { query: 'cats' },
    })

    expect(result.isError).toBeUndefined()
    expect(ctx.client.searchImages).toHaveBeenCalled()
    const parsed = JSON.parse(firstText(result.content)) as Array<{ attribution: string }>
    expect(parsed[0]?.attribution).toBe('by alice via Pixabay')
  })

  it('calls pixabay_search_videos over the transport and returns a real result', async () => {
    const ctx = fakeCtx()
    const client = await connectedClient(ctx)

    const result = await client.callTool({
      name: 'pixabay_search_videos',
      arguments: { query: 'ocean' },
    })

    expect(result.isError).toBeUndefined()
    expect(ctx.client.searchVideos).toHaveBeenCalled()
    const parsed = JSON.parse(firstText(result.content)) as Array<{ url: string }>
    expect(parsed[0]?.url).toBe('https://cdn.pixabay.com/x.mp4')
  })

  it('calls pixabay_get_image over the transport', async () => {
    const ctx = fakeCtx()
    const client = await connectedClient(ctx)

    const result = await client.callTool({ name: 'pixabay_get_image', arguments: { id: 1 } })

    expect(result.isError).toBeUndefined()
    // The real transport always provides a genuine AbortSignal (tied to
    // notifications/cancelled), unlike the unit tests where it's undefined.
    expect(ctx.client.searchImages).toHaveBeenCalledWith({ id: 1 }, expect.any(AbortSignal))
  })

  it('surfaces an empty search as isError:true, not a protocol error', async () => {
    const ctx: ToolContext = {
      client: {
        searchImages: vi.fn().mockResolvedValue({ total: 0, totalHits: 0, hits: [] }),
        searchVideos: vi.fn(),
      },
    }
    const client = await connectedClient(ctx)

    const result = await client.callTool({
      name: 'pixabay_search_images',
      arguments: { query: 'zzznonexistentzzz' },
    })

    expect(result.isError).toBe(true)
    expect(firstText(result.content)).toMatch(/no images found/i)
  })
})
