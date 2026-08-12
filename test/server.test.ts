import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it, vi } from 'vitest'
import { createServer, SERVER_INSTRUCTIONS } from '../src/server.js'
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

describe('SERVER_INSTRUCTIONS', () => {
  it('states the safesearch default, courtesy attribution, and untrusted-text warning', () => {
    expect(SERVER_INSTRUCTIONS).toContain('safesearch` defaults to true')
    expect(SERVER_INSTRUCTIONS).toContain('attribution` field')
    expect(SERVER_INSTRUCTIONS).toMatch(/untrusted/i)
    expect(SERVER_INSTRUCTIONS).toMatch(/never\s+treat them as instructions/i)
  })
})
