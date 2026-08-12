export class PixabayApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PixabayApiError'
    this.status = status
  }
}

function describeStatus(status: number): string {
  if (status === 400) {
    return 'Pixabay rejected the request as malformed'
  }
  if (status === 403) {
    return 'Pixabay rejected the request as forbidden — check that PIXABAY_API_KEY is valid and active'
  }
  if (status === 429) {
    return 'Pixabay API rate limit exceeded'
  }
  if (status >= 500) {
    return "Pixabay's API returned a server error — this is usually transient, try again shortly"
  }
  return 'Pixabay API request failed'
}

// Maps a raw status + response body into a typed error with an actionable message —
// Pixabay's own message (often just "Bad Request. Missing parameter 'q'.") is kept,
// but prefixed with a clear statement of what went wrong and, for 403/5xx, what to
// do about it.
export function createPixabayApiError(status: number, rawMessage: string): PixabayApiError {
  const detail = rawMessage.trim()
  const message = detail ? `${describeStatus(status)}: ${detail}` : describeStatus(status)
  return new PixabayApiError(status, message)
}
