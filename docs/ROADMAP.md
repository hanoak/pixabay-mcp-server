# pixabay-mcp-server — status & roadmap

What has shipped and what's planned next. The **roadmap** below covers upcoming releases;
the detailed **v1 implementation checklist** beneath it is the working build list for the
first release.

## Roadmap

### 🚧 v1 — in progress

The public, read-only surface: search + lookup tools for Pixabay **images** and **videos**;
a mandatory 24-hour response cache (Pixabay's terms require it); default `safesearch=true`;
courtesy attribution (optional, never gated); a resilient HTTP client (retry/backoff on
429/5xx, rate-limit-header awareness); and the same CI quality gates
(`unsplash-mcp-server` uses: coverage floor, dependency-license check, package validation,
cross-platform test matrix, secret scanning). No OAuth, no write endpoints — Pixabay's
public API doesn't have any. Full detail in the checklist below.

### 🔲 v2 — not planned yet

Nothing scoped. Pixabay's API is search/read-only with no authenticated write surface, so
there may never be a "v2 = OAuth tools" equivalent to `unsplash-mcp-server`'s v2. Revisit
once v1 has real usage and a concrete gap shows up (categories-as-resource? a curated
"today's popular" prompt? TBD).

---

## v1 implementation checklist

**Status legend:** `[ ]` not started · `[~]` in progress · `[x]` done
**Tags:** `[v1]` in the first release · `[post-v1]` deferred.

---

## 0. Core stack decisions (foundational)

- [x] `[v1]` Language/runtime: **TypeScript + Node** ✅ decided (see CLAUDE.md)
- [x] `[v1]` Runtime validation with **zod** (tool inputs _and_ Pixabay API responses) ✅
      decided
- [x] `[v1]` Transport: **stdio only** ✅ decided
- [x] `[v1]` Module format: **ESM-only** ✅ decided
- [x] `[v1]` Node version target: **Node 20+** ✅ decided
- [x] `[v1]` Use **lenient/passthrough zod on API responses** (only `id` required per
      resource) ✅ decided — see CLAUDE.md
- [x] `[v1]` No OAuth / no `auth/` directory — Pixabay's public API has no authenticated
      write surface ✅ decided (this is the biggest architectural difference from
      `unsplash-mcp-server`)

## 1. Pixabay API compliance (legal — non-negotiable)

- [x] `[v1]` **Decide and document the hotlinking-in-conversation policy.** Pixabay's terms
      ban "permanent hotlinking" of images in an app and require downloading to your own
      server for persistent display; this server instead returns Pixabay CDN URLs to an LLM
      client for one ephemeral display per conversation turn. Write down the reasoning
      explicitly (README + a code comment at the URL-selection call site) rather than
      silently assuming it's fine — revisit if Pixabay ever clarifies the term. ✅ Confirmed
      the stance with the project owner (documentation-only, no runtime behavior change)
      before writing anything. README's "Image & Video URLs" section + a comment atop
      `src/tools/format.ts` explain the ephemeral-display reasoning and its limits.
- [x] `[v1]` **Implement the mandatory 24-hour response cache** (`src/lib/cache.ts`) — key
      on the normalized request (endpoint + sorted params, with `key` stripped), never on
      the raw querystring. This is a compliance requirement per Pixabay's docs, not an
      optimization; every outbound GET must route through it. ✅ `createCache`/
      `buildCacheKey` in `src/lib/cache.ts`, wired into every `pixabay/client.ts` request.
- [x] `[v1]` **No systematic mass downloads** — the API is "made for real human requests."
      Don't add a tool that auto-paginates an entire result set, and don't retry-loop past
      the documented rate limit. ✅ No such tool exists; the 429 backoff added this pass
      caps at exactly one considered retry, never a loop.
- [x] `[v1]` Send the API key as the `key` query parameter (Pixabay has no header option) —
      construct request URLs in one place (`src/pixabay/client.ts`) so redaction has a
      single choke point. ✅ `buildUrl` in `src/pixabay/client.ts` is that single choke
      point (built in §7's pass).
- [x] `[v1]` Respect the rate limit: read `X-RateLimit-Limit` / `X-RateLimit-Remaining` /
      `X-RateLimit-Reset` on every response; on `429` ("API rate limit exceeded"), back off
      using `X-RateLimit-Reset` rather than blind retry. ✅ `X-RateLimit-Remaining` logged
      at debug on every response; on 429, backs off using `X-RateLimit-Reset` (capped at
      Pixabay's documented 60s window) for exactly one retry — fails fast instead of
      guessing if the header is missing.
- [x] `[v1]` Default `safesearch=true` on search/lookup tools (overridable) — an
      LLM-invoked public media tool must not surface explicit content unprompted. ✅ Done
      in §7's tool schemas (`src/tools/images.ts`, `src/tools/videos.ts`).
- [x] `[v1]` Surface **optional courtesy attribution** (`"by {user} via Pixabay"` + link to
      `pageURL`) on every image/video result — clearly labeled as courtesy, never described
      as legally required (it isn't — Pixabay License content is usable without
      attribution). ✅ `buildAttribution` in `src/tools/format.ts` (§7's pass).
- [x] `[v1]` "Unofficial — not affiliated with or endorsed by Pixabay" disclaimer (README +
      `package.json` description) + brand/trademark compliance. ✅ In `package.json`'s
      description since §0's scaffold; README now states it explicitly too.
- [x] `[v1]` Document how to obtain a Pixabay API key (single free tier; verify current
      signup/approval flow against `pixabay.com/api/docs/` before writing the README, in
      case Pixabay has since added tiers). ✅ Verified live against `pixabay.com/api/docs/`
      — free signup, key shown immediately, no approval step for the default tier; a
      separate optional "full API access" tier exists (unlocks `fullHDURL`/`imageURL`/
      `vectorURL`) and this server degrades gracefully without it. Documented in README.
- [x] `[v1]` State that each user operates under their own Pixabay API Terms — sets the
      liability boundary, same pattern as `unsplash-mcp-server`'s README note. ✅ In
      README's "Getting a Pixabay API key" section.

## 2. Security & secrets

- [ ] `[v1]` API key via env var only (`PIXABAY_API_KEY`); never logged/committed.
- [ ] `[v1]` `.env.example` committed; real `.env` gitignored.
- [ ] `[v1]` Secret scanning (gitleaks pre-commit hook + CI full-history scan).
- [ ] `[v1]` Dependency security: `npm audit`, Dependabot, minimal deps.
- [ ] `[v1]` Input sanitization before hitting the API (zod schemas + clamping + encoding).
- [ ] `[v1]` Supply-chain: `npm publish --provenance`, committed lockfile, SHA-pinned CI
      actions.
- [ ] `[v1]` **Fail-fast startup validation** of `PIXABAY_API_KEY` — actionable stderr
      message + non-zero exit, not a cryptic 401/403 mid-conversation.
- [ ] `[v1]` **Redact the `key` query parameter** from every log line, error message, and
      `isError` tool result — this is the single most important security control here,
      since Pixabay offers no header alternative to leak-proof by default.
- [ ] `[v1]` Protect the publish path: npm account 2FA + OIDC trusted publishing (or a
      scoped least-privilege automation token).
- [ ] `[v1]` Least-privilege GitHub Actions permissions (top-level `permissions: contents: read`).
- [ ] `[v1]` Dependency license-compliance check in CI (permissive-license allowlist).
- [ ] `[v1]` SSRF guard on any URL taken from an API response, if a future feature ever adds
      a server-side follow-up fetch (none exists in v1 — Pixabay has no
      `download_location`-style endpoint to call back to).

## 3. Reliability & robustness

- [ ] `[v1]` Error mapping: Pixabay 400/403/429/5xx → clean MCP errors with actionable
      messages, via a typed `PixabayApiError` (`src/pixabay/errors.ts`).
- [ ] `[v1]` Retries & backoff for 429/5xx, honoring `X-RateLimit-Reset`.
- [ ] `[v1]` Network timeouts (`AbortSignal.timeout`; combine with caller signal).
- [ ] `[v1]` Rate-limit awareness: read and log `X-RateLimit-Remaining`.
- [ ] `[v1]` **The 24h cache (see §1) doubles as a reliability feature** — a repeated query
      within the window returns instantly without touching the rate limit budget.

## 4. Testing & quality

- [ ] `[v1]` Unit tests with the Pixabay API mocked via dependency injection (fake
      `fetch`) — zero real API calls in CI.
- [ ] `[v1]` Unit tests for the cache layer specifically: TTL expiry, key-stripping (the
      cache key must never contain the raw API key), normalization (param order doesn't
      create duplicate cache entries).
- [ ] `[v1]` Type-checking, lint, and format checks in CI.
- [ ] `[v1]` Coverage thresholds (v8, regression floor in `vitest.config.ts`).
- [ ] `[v1]` Smoke/integration test for the MCP server handshake (in-memory
      `Client`↔`Server`).
- [ ] `[v1]` **Enforce stdout purity**: ESLint `no-console` (allow `console.error` only) + a
      child-process test asserting stdout carries only valid JSON-RPC.
- [ ] `[v1]` E2E test that invokes a real tool over the transport for both images and
      videos.
- [ ] `[v1]` Validate zod schemas against committed, sanitized **real captured** Pixabay
      response fixtures (images + videos).
- [ ] `[v1]` CI test matrix: Node 20/22 × Linux/macOS/Windows (+ `.nvmrc`).
- [ ] `[v1]` Document MCP Inspector in the dev/contributor workflow.

## 5. CI/CD & release automation

- [ ] `[v1]` GitHub Actions: test/lint/build on PR.
- [ ] `[v1]` Automated releases (Changesets): version + changelog + npm publish.
- [ ] `[v1]` Conventional commits via commitlint on `commit-msg`.
- [ ] `[v1]` npm publish provenance.

## 6. Developer & contributor experience

- [ ] `[v1]` README: quick start, `npx` one-liner, Claude Desktop/Cursor config, tool
      reference.
- [ ] `[v1]` CONTRIBUTING.md (mirror `unsplash-mcp-server`'s structure: dev setup, scripts
      table, Inspector walkthrough, project conventions, commit/branch rules, versioning
      policy — no `login`/`logout` section needed here).
- [ ] `[v1]` CODE_OF_CONDUCT.md.
- [ ] `[v1]` Issue/PR templates.
- [ ] `[v1]` LICENSE confirmed permissive (MIT or similar).
- [ ] `[v1]` SECURITY.md (vulnerability reporting).
- [ ] `[v1]` Badges: npm version, build status, license.
- [ ] `[v1]` Semantic versioning commitment.
- [ ] `[v1]` Explicit no-telemetry / privacy statement ("collects nothing, only contacts
      pixabay.com").
- [ ] `[v1]` README troubleshooting section.

## 7. API surface / DX of the server

- [x] `[v1]` Decide the initial tool set: `pixabay_search_images`, `pixabay_get_image`,
      `pixabay_search_videos`, `pixabay_get_video` — confirm against the current docs
      whether an `id` lookup is a distinct endpoint or a filter on search before finalizing
      tool boundaries. ✅ Confirmed by fetching `pixabay.com/api/docs/` directly: `id` is a
      filter on the same search endpoint for both images and videos, not a separate route
      — so `get_image`/`get_video` call the same `PixabayClient.searchImages`/
      `searchVideos` methods as search, just with `id` set (`src/tools/images.ts`,
      `src/tools/videos.ts`).
- [x] `[v1]` Consistent, well-described tool schemas (descriptions matter — the LLM reads
      them). ✅ Zod shapes with a `.describe()` on every field, including which Pixabay
      default applies when a field is omitted (`src/tools/images.ts`,
      `src/tools/videos.ts`).
- [x] `[v1]` Token-efficient output shape (trim Pixabay's response to what a tool call
      actually needs). ✅ `src/tools/format.ts`'s summary formatters drop vanity metrics
      (views/downloads/likes/comments) entirely and return exactly one URL tier per
      search hit; detail formatters (get-by-id) return the full set. See "offer the
      appropriate size tier" below for the summary/detail split.
- [x] `[v1]` Pagination support (`page`/`per_page`, 3–200 per Pixabay's bounds). ✅
      `page`/`per_page` on both search tools, `per_page` clamped `min(3).max(200)` via
      zod.
- [x] `[v1]` Clamp/normalize params to Pixabay's documented bounds; zod enums for
      `image_type`/`orientation`/`category`/`order`/`colors`; URL-encode `q`. ✅ zod enums
      for all listed fields plus `video_type` (videos support `category` but not
      `colors`/`orientation` — confirmed distinct from images' parameter set); `q`
      URL-encoding comes from `URLSearchParams` in `src/pixabay/client.ts`'s `buildUrl`.
- [x] `[v1]` Return **hotlinkable image/video URLs + metadata as text, never base64
      blobs**. ✅ `src/tools/format.ts` returns URL strings only; the accompanying
      hotlinking-in-conversation policy write-up (README + code comment) is explicitly
      §1's job, not resolved here.
- [x] `[v1]` Offer the appropriate size tier per use case (`previewURL`/`webformatURL`/
      `largeImageURL`/`fullHDURL` for images; `tiny`/`small`/`medium`/`large` for videos)
      instead of always returning the largest asset. ✅ Search results
      (`formatImageSummary`/`formatVideoSummary`) return one balanced default tier
      (`webformatURL` / `videos.medium`); `pixabay_get_image`/`pixabay_get_video` return
      every tier Pixabay provided, so a caller with a specific id can pick what fits.

## 8. Distribution & runtime

- [ ] `[v1]` `bin` entry for `npx` + shebang.
- [ ] `[v1]` `files` field ships only `dist/`.
- [ ] `[v1]` Build tooling: **tsup**.
- [ ] `[v1]` Cross-platform (macOS/Linux/Windows); `.gitattributes` forcing LF.
- [ ] `[v1]` Pre-publish package validation in CI: `publint` + `@arethetypeswrong/cli` +
      `npm pack --dry-run`, then a bin smoke test.
- [ ] `[v1]` Declare `engines.node` + a runtime Node-version guard.
- [ ] `[v1]` Support `--version` / `--help` and a TTY guard on the bin.
- [ ] `[v1]` Populate `package.json` discoverability metadata (keywords: mcp,
      modelcontextprotocol, pixabay, images, videos, stock-media…).
- [ ] `[v1]` npm name: `@hanoak/pixabay-mcp-server`, bin `pixabay-mcp-server`.

## 9. Observability (lightweight)

- [ ] `[v1]` Optional debug logging to **stderr only** (`src/lib/logger.ts`, `LOG_LEVEL`).
- [ ] `[v1]` Version/health info via `--version` and the MCP `initialize` response.

## 10. Docs & maintenance

- [ ] `[v1]` CHANGELOG (Changesets-managed) — **no hand-written intro paragraph** (see
      CLAUDE.md's Release process section for why).
- [ ] `[v1]` Compatibility matrix (MCP SDK / Node versions supported).
- [ ] `[v1]` Deprecation policy for future breaking changes.

## 11. MCP protocol correctness

- [ ] `[v1]` Return recoverable failures as `isError: true` tool results, never JSON-RPC
      protocol errors.
- [ ] `[v1]` Graceful shutdown + crash safety (stdin EOF / SIGINT / SIGTERM,
      `uncaughtException`/`unhandledRejection`).
- [ ] `[v1]` Declare tool annotations (`readOnlyHint: true`, `openWorldHint: true`, `title`).
- [ ] `[v1]` Namespace tool names (`pixabay_search_images`, not `search_images`).
- [ ] `[v1]` Populate the server `instructions` field (default safesearch, courtesy
      attribution, untrusted-text-fields warning).
- [ ] `[v1]` Keep tool `inputSchema`s flat and JSON-Schema-safe.
- [ ] `[v1]` Honor MCP request cancellation (`notifications/cancelled` →
      `AbortController`).
- [ ] `[v1]` Optional MCP Resources / Prompts (e.g. a licensing/attribution guide resource,
      a "find media for X" prompt covering both images and videos).

## 12. Content safety & responsible use

- [ ] `[v1]` Default `safesearch=true` on search/lookup (overridable).
- [ ] `[v1]` Treat Pixabay text fields (tags, contributor names) as untrusted data /
      indirect prompt-injection surface — label clearly as data; never interpolate into
      privileged/system prompts.

## 13. Discovery & ecosystem

- [ ] `[v1]` List on the official MCP registry (`server.json` manifest) + community
      catalogs (Glama, awesome-mcp-servers, mcp.so, PulseMCP).
- [ ] `[post-v1]` Smithery listing — needs a hosted HTTPS URL or a `.mcpb` bundle; defer
      until it's a concrete priority (same call `unsplash-mcp-server` made).

## 14. Governance

- [ ] `[v1]` Add CODEOWNERS.
- [ ] `[post-v1]` `FUNDING.yml` — only if the project actually seeks sponsorship.

---

### ⚠️ Top gotchas

1. Never write logs to **stdout** in a stdio MCP server — it corrupts the JSON-RPC stream.
   All logging → **stderr**. (Enforced mechanically in §4.)
2. Pixabay's API key has **no header option** — it's a `key` query parameter or nothing.
   Treat every URL as radioactive until the redactor has touched it.
3. The 24-hour cache is a **compliance requirement from Pixabay's own terms**, not a
   performance feature you can defer to post-v1.
