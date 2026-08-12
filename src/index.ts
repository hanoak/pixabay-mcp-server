import { ConfigError } from './config.js'
import { nodeVersionError } from './lib/node-guard.js'
import { runServer } from './server.js'
import { version } from './version.js'

// Entry point for the `pixabay-mcp-server` bin. The tsup build prepends the
// `#!/usr/bin/env node` shebang so this file is directly executable via npx.

const BIN_NAME = 'pixabay-mcp-server'

const HELP = `${BIN_NAME} v${version}
An unofficial Model Context Protocol (MCP) server for the Pixabay API.

This is a stdio server, meant to be launched by an MCP client (Claude Desktop,
Cursor, etc.) — not run directly. Configure it in your client and provide a
Pixabay API key via the PIXABAY_API_KEY environment variable.

Usage:
  pixabay-mcp-server            Run the MCP server over stdio
  pixabay-mcp-server --version  Print the version and exit
  pixabay-mcp-server --help     Print this help and exit

Environment:
  PIXABAY_API_KEY  (required)   your Pixabay API key
  LOG_LEVEL        debug | info | warn | error (default: info)

Docs: https://github.com/hanoak/pixabay-mcp-server`

// Last-resort crash guards. A stray throw must go to stderr, never stdout (which
// carries the JSON-RPC stream), and must exit non-zero.
function fatal(prefix: string, error: unknown): never {
  // Configuration problems are user-facing: print the guidance verbatim, without
  // the "fatal" framing or a stack trace.
  if (error instanceof ConfigError) {
    process.stderr.write(`${error.message}\n`)
    process.exit(1)
  }
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error)
  process.stderr.write(`[${BIN_NAME}] fatal: ${prefix}: ${detail}\n`)
  process.exit(1)
}

function main(): void {
  // Refuse to run on an unsupported Node.js with a clear message instead of a
  // cryptic crash mid-conversation when a newer API is missing.
  const versionError = nodeVersionError()
  if (versionError !== null) {
    process.stderr.write(`${versionError}\n`)
    process.exit(1)
  }

  const args = new Set(process.argv.slice(2))

  if (args.has('--version') || args.has('-v')) {
    process.stdout.write(`${version}\n`)
    return
  }
  if (args.has('--help') || args.has('-h')) {
    process.stdout.write(`${HELP}\n`)
    return
  }

  // Launched interactively in a terminal? The stdio JSON-RPC loop would just hang
  // waiting for input, so print usage and exit instead of appearing frozen.
  if (process.stdin.isTTY) {
    process.stderr.write(`${HELP}\n`)
    return
  }

  process.on('uncaughtException', (error) => fatal('uncaughtException', error))
  process.on('unhandledRejection', (reason) => fatal('unhandledRejection', reason))
  runServer().catch((error: unknown) => fatal('startup', error))
}

main()
