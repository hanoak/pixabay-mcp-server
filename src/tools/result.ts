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
// protocol error.
export function toErrorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}
