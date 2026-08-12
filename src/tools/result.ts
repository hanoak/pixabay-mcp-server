import { PixabayApiError } from '../pixabay/errors.js'
import { SchemaValidationError } from '../schemas/parse.js'

// No requireUserToken helper here — Pixabay's public API has no auth tier beyond the
// API key, so there's nothing analogous to unplash-mcp-server's token-gated results.

export interface ToolTextContent {
  type: 'text'
  text: string
}

export interface ToolResult {
  // Index signature matches the MCP SDK's CallToolResult shape so handlers can return
  // this type directly wherever the SDK expects one.
  [key: string]: unknown
  content: ToolTextContent[]
  isError?: boolean
}

export function toSuccessResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

// Recoverable failures (4xx, empty results, bad query, rate-limited) come back as
// isError:true tool results the LLM can see and adapt to — never a thrown JSON-RPC
// protocol error. For static, hand-written messages (e.g. "no results found") —
// these never contain the API key, so no redaction step is needed here.
export function toErrorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}

// Maps a caught exception (from a PixabayClient call) to an isError result,
// redacting the message before it's returned. This is a second, mandatory safety
// net alongside pixabay/client.ts's own source-level redaction — not every future
// throw site is guaranteed to redact itself, so this boundary must not be
// treated as optional.
export function toErrorResultFromError(
  error: unknown,
  redact: (input: string) => string,
): ToolResult {
  return {
    content: [{ type: 'text', text: redact(errorText(error)) }],
    isError: true,
  }
}

function errorText(error: unknown): string {
  if (error instanceof PixabayApiError) return error.message
  if (error instanceof SchemaValidationError) return error.message
  if (error instanceof Error) return `Unexpected error: ${error.message}`
  return 'Unexpected error.'
}
