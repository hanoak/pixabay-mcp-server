// Bare-bones for now: carries just the HTTP status and Pixabay's own message.
// Full 400/403/429/5xx-specific mapping with actionable guidance is a later section.
export class PixabayApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PixabayApiError'
    this.status = status
  }
}
