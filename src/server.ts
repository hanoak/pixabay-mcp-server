import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { loadConfig } from './config.js'
import { createCache } from './lib/cache.js'
import { createLogger, type Logger } from './lib/logger.js'
import { createRedactor } from './lib/redact.js'
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

// Composition root: fail-fast validate the environment (a missing key throws
// ConfigError, caught by index.ts's fatal() — not here), build the Pixabay client,
// assemble the server, and wire it to the stdio transport. Requires a real
// PIXABAY_API_KEY and a real stdio connection, so it's exercised by the e2e spawn
// tests (test/stdout-purity.test.ts) instead of unit tests — same reason index.ts
// is excluded from the coverage report, not a gap.
/* v8 ignore start */
export async function runServer(): Promise<void> {
  const config = loadConfig()
  const redactor = createRedactor(config.apiKey)
  const logger = createLogger(config.logLevel, redactor)
  const cache = createCache()
  const client = createPixabayClient({ apiKey: config.apiKey, cache, logger, redactor })
  const server = createServer({ client })
  const transport = new StdioServerTransport()
  await server.connect(transport)
  logger.info(`${name} v${version} running on stdio`)

  installShutdownHandlers(logger)
}

// Exit cleanly when the client stops us: by signal, or by closing our stdin (how
// MCP clients such as Claude Desktop terminate a spawned server). Without this the
// process lingers as an orphan on every client restart.
function installShutdownHandlers(logger: Logger): void {
  let shuttingDown = false
  const shutdown = (reason: string): void => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info(`shutting down (${reason})`)
    process.exit(0)
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.stdin.on('end', () => shutdown('stdin closed'))
  process.stdin.on('close', () => shutdown('stdin closed'))
}
/* v8 ignore stop */
