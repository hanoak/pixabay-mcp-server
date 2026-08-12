import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.js'
import { createLogger } from './lib/logger.js'
import { createPixabayClient, type PixabayClient } from './pixabay/client.js'
import { registerTools } from './tools/index.js'
import { name, version } from './version.js'

export interface ServerContext {
  client: PixabayClient
}

export function createServer(ctx: ServerContext): McpServer {
  const server = new McpServer({ name, version })
  registerTools(server, ctx)
  return server
}

export async function runServer(): Promise<void> {
  let config
  try {
    config = loadConfig()
  } catch (error) {
    // LOG_LEVEL isn't known yet at this point — 'info' (the default) is right for a
    // startup failure regardless.
    createLogger().error(error instanceof Error ? error.message : String(error))
    process.exit(1)
    return
  }

  const logger = createLogger(config.logLevel)
  const client = createPixabayClient({ apiKey: config.apiKey })
  const server = createServer({ client })
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info(`${name} v${version} running on stdio`)
}
