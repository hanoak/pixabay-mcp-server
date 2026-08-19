# Changelog

## 1.0.1

### Patch Changes

- 73990f7: Add an MCP Registry badge to the README, linking to the server's live listing on the official registry.

## 1.0.0

### Major Changes

- Initial public release. An MCP server for Pixabay's royalty-free image and video search
  API:

  - **Images**: `pixabay_search_images`, `pixabay_get_image`
  - **Videos**: `pixabay_search_videos`, `pixabay_get_video`
  - A `pixabay://guides/usage` resource covering the Pixabay Content License, the
    hotlinking-in-conversation policy, and content-safety guidance
  - A `find_media` prompt for searching images and/or videos by subject
  - A mandatory 24-hour response cache (required by Pixabay's terms), API-key redaction
    (Pixabay's key is query-param-only, with no header alternative), and retry/backoff on
    429/5xx honoring Pixabay's rate-limit headers
  - `safesearch` defaults to `true` on every search tool
