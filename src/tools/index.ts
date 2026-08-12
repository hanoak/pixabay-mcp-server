import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerImageTools } from './images.js'
import { registerVideoTools } from './videos.js'
import type { ToolContext } from './shared.js'

export function registerTools(server: McpServer, ctx: ToolContext): void {
  registerImageTools(server, ctx)
  registerVideoTools(server, ctx)
}
