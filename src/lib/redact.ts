export interface Redactor {
  redact: (input: string) => string
}

const PLACEHOLDER = '[REDACTED]'

// Pixabay's key is only ever accepted as a query param — there's no header
// alternative to leak-proof by default. This strips the literal key (and its
// URL-encoded form, in case it ever contains characters that get percent-encoded)
// from any string before it reaches a log line or an isError tool result.
export function createRedactor(apiKey: string): Redactor {
  if (!apiKey) {
    return { redact: (input) => input }
  }

  const patterns = Array.from(new Set([apiKey, encodeURIComponent(apiKey)]))

  return {
    redact(input: string): string {
      return patterns.reduce((result, pattern) => result.split(pattern).join(PLACEHOLDER), input)
    },
  }
}
