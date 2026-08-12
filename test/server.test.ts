import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'
import { createServer } from '../src/server.js'
import type { ToolContext } from '../src/tools/shared.js'

// A fuller in-memory Client<->Server handshake/listTools test is explicitly §4's job —
// this is just a light smoke check that composition root wiring doesn't throw.
describe('createServer', () => {
  it('builds an McpServer without throwing, given a fake client', () => {
    const ctx: ToolContext = {
      client: {
        searchImages: vi.fn(),
        searchVideos: vi.fn(),
      },
    }

    const server = createServer(ctx)

    expect(server).toBeInstanceOf(McpServer)
  })
})
