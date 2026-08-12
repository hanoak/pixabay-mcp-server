# pixabay-mcp-server — status & roadmap

What has shipped and what's planned next. The **roadmap** below covers upcoming releases;
the detailed **v1 implementation checklist** beneath it is the working build list for the
first release.

## Roadmap

### 🟢 v1 — shipped

The public, read-only surface: search + lookup tools for Pixabay **images** and **videos**;
a mandatory 24-hour response cache (Pixabay's terms require it); default `safesearch=true`;
courtesy attribution (optional, never gated); a resilient HTTP client (retry/backoff on
429/5xx, rate-limit-header awareness); MCP resources/prompts; and the same CI quality gates
(`unsplash-mcp-server` uses: coverage floor, dependency-license check, package validation,
cross-platform test matrix, secret scanning). No OAuth, no write endpoints — Pixabay's
public API doesn't have any. Every `[v1]` checklist item is done: `@hanoak/pixabay-mcp-server`
is published on npm (with provenance) and listed on the official MCP registry
(`io.github.hanoak/pixabay-mcp-server`). Full detail in the checklist below.

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

- [x] `[v1]` API key via env var only (`PIXABAY_API_KEY`); never logged/committed. ✅
      `config.ts` reads it from `process.env` only; the redactor (below) keeps it out
      of logs/errors even if a bug ever tried to include it.
- [x] `[v1]` `.env.example` committed; real `.env` gitignored. ✅ `.env` was already
      gitignored since §0's scaffold; `.env.example` documents both env vars.
- [x] `[v1]` Secret scanning (gitleaks pre-commit hook + CI full-history scan). ✅
      Pre-commit hook (`gitleaks protect --staged`) live since §0;
      `.github/workflows/secret-scan.yml` (§5) runs `gitleaks/gitleaks-action` on
      every push/PR. Caveat: that action diffs the current push/PR rather than
      walking the full history from repo genesis on every run — still meaningful
      continuous coverage, just worth knowing it's not literally a from-scratch
      history scan each time.
- [x] `[v1]` Dependency security: `npm audit`, Dependabot, minimal deps. ✅
      `npm audit --omit=dev --audit-level=high` is currently clean; `.github/
dependabot.yml` watches npm + github-actions weekly; only 2 runtime deps
      (`@modelcontextprotocol/sdk`, `zod`).
- [x] `[v1]` Input sanitization before hitting the API (zod schemas + clamping + encoding).
      ✅ Done in §7's tool schemas (enums, numeric bounds) and `pixabay/client.ts`'s
      `buildUrl`, which encodes every param via `URLSearchParams`.
- [x] `[v1]` Supply-chain: `npm publish --provenance`, committed lockfile, SHA-pinned CI
      actions. ✅ `package-lock.json` committed since §0; `release.yml` sets
      `NPM_CONFIG_PROVENANCE: 'true'` with `id-token: write`; every `uses:` in all
      three workflow files is pinned to a verified commit SHA, not a floating tag.
- [x] `[v1]` **Fail-fast startup validation** of `PIXABAY_API_KEY` — actionable stderr
      message + non-zero exit, not a cryptic 401/403 mid-conversation. ✅ Done in the
      §0/§7 pass (`config.ts` + `server.ts`'s `runServer`).
- [x] `[v1]` **Redact the `key` query parameter** from every log line, error message, and
      `isError` tool result — this is the single most important security control here,
      since Pixabay offers no header alternative to leak-proof by default. ✅
      `lib/redact.ts`'s `createRedactor`, wired into `createLogger` (every log line)
      and `pixabay/client.ts` (a raw network error thrown by `fetch()` itself, which
      can embed the request URL, plus the non-ok-response error body as
      defense-in-depth).
- [x] `[v1]` Protect the publish path: npm account 2FA + OIDC trusted publishing (or a
      scoped least-privilege automation token). ✅ 2FA enabled on the npm account;
      `NPM_TOKEN` automation token added as a repo secret and confirmed working —
      `@hanoak/pixabay-mcp-server@1.0.0` published with provenance via `release.yml`.
      OIDC trusted publishing remains available as an optional follow-up (drop the
      token entirely) now that the package exists on the registry, but isn't
      required — the token-based path is a legitimate, already-working option.
- [x] `[v1]` Least-privilege GitHub Actions permissions (top-level `permissions: contents: read`).
      ✅ All three workflows default to `contents: read`; `release.yml`'s job
      elevates only `contents: write` / `pull-requests: write` / `id-token: write`,
      scoped to that one job, not the workflow default.
- [x] `[v1]` Dependency license-compliance check in CI (permissive-license allowlist).
      ✅ `license:check` script (`license-checker-rseidelsohn`) runs in ci.yml's
      `quality` job against an allowlist of permissive licenses only.
- [x] `[v1]` SSRF guard on any URL taken from an API response, if a future feature ever adds
      a server-side follow-up fetch (none exists in v1 — Pixabay has no
      `download_location`-style endpoint to call back to). ✅ Not applicable — confirmed
      no such feature exists in this codebase; nothing to guard.

## 3. Reliability & robustness

- [x] `[v1]` Error mapping: Pixabay 400/403/429/5xx → clean MCP errors with actionable
      messages, via a typed `PixabayApiError` (`src/pixabay/errors.ts`). ✅
      `createPixabayApiError` maps each status to a clear statement (plus, for
      403/5xx, what to do about it) while keeping Pixabay's own message as detail.
- [x] `[v1]` Retries & backoff for 429/5xx, honoring `X-RateLimit-Reset`. ✅ 429 backs
      off using `X-RateLimit-Reset` (§1's pass); 5xx now backs off a fixed 500ms.
      Both cap at exactly one considered retry — never blind or looping.
- [x] `[v1]` Network timeouts (`AbortSignal.timeout`; combine with caller signal). ✅
      Every fetch carries a 10s timeout (configurable via `timeoutMs` for tests),
      combined with an optional caller-provided `AbortSignal` via `AbortSignal.any` —
      no caller passes one yet, but `PixabayClient`'s methods already accept it, ready
      for §11's MCP cancellation wiring without another interface change.
- [x] `[v1]` Rate-limit awareness: read and log `X-RateLimit-Remaining`. ✅ Done in
      §1's pass (`logRateLimitRemaining` in `pixabay/client.ts`).
- [x] `[v1]` **The 24h cache (see §1) doubles as a reliability feature** — a repeated query
      within the window returns instantly without touching the rate limit budget. ✅
      Already true by construction since §1's cache integration — no new code needed,
      just noting it here as the reliability angle on the same feature.

## 4. Testing & quality

- [x] `[v1]` Unit tests with the Pixabay API mocked via dependency injection (fake
      `fetch`) — zero real API calls in CI. ✅ True throughout every test file written
      so far — `vi.stubGlobal('fetch', ...)` with fake `Response`s, never a real call.
- [x] `[v1]` Unit tests for the cache layer specifically: TTL expiry, key-stripping (the
      cache key must never contain the raw API key), normalization (param order doesn't
      create duplicate cache entries). ✅ Done in §1's pass (`test/lib/cache.test.ts`).
- [x] `[v1]` Type-checking, lint, and format checks in CI. ✅ `ci.yml`'s `quality` job
      runs `typecheck`/`lint`/`format:check` (plus `audit:prod`/`test:coverage`/
      `license:check`) on every push/PR.
- [x] `[v1]` Coverage thresholds (v8, regression floor in `vitest.config.ts`). ✅ Raised
      this pass to 90/90/90/90, just below the suite's current 91.6/92.5/92.7/91.8.
- [x] `[v1]` Smoke/integration test for the MCP server handshake (in-memory
      `Client`↔`Server`). ✅ `test/server.integration.test.ts` — a real `Client` and
      real `Server` over `InMemoryTransport`, only the `PixabayClient` faked.
- [x] `[v1]` **Enforce stdout purity**: ESLint `no-console` (allow `console.error` only) + a
      child-process test asserting stdout carries only valid JSON-RPC. ✅ ESLint rule
      since §0; `test/stdout-purity.test.ts` spawns the built bin and validates every
      stdout line. A new `pretest` script (`npm run build`) keeps `dist/` fresh for it.
- [x] `[v1]` E2E test that invokes a real tool over the transport for both images and
      videos. ✅ Part of `test/server.integration.test.ts` —
      `pixabay_search_images`/`pixabay_search_videos`/`pixabay_get_image` calls over
      the real transport.
- [x] `[v1]` Validate zod schemas against committed, sanitized **real captured** Pixabay
      response fixtures (images + videos). ✅ with a caveat: `test/fixtures/` uses
      Pixabay's own documented example responses from `pixabay.com/api/docs/`, not a
      response actually captured from a live call — no `PIXABAY_API_KEY` is available
      in this dev/CI environment. Still genuine Pixabay-sourced field shapes, not
      hand-invented data. Worth re-validating against a real live response if/when a
      key is available.
- [x] `[v1]` CI test matrix: Node 20/22 × Linux/macOS/Windows (+ `.nvmrc`). ✅ `.nvmrc`
      since §0; `ci.yml`'s `test` job matrixes `node: [20, 22]` ×
      `os: [ubuntu-latest, macos-latest, windows-latest]`.
- [x] `[v1]` Document MCP Inspector in the dev/contributor workflow. ✅
      `CONTRIBUTING.md`'s "Using MCP Inspector" section — the rest of that document is
      §6's job.

## 5. CI/CD & release automation

- [x] `[v1]` GitHub Actions: test/lint/build on PR. ✅ `ci.yml` — `quality` (typecheck/
      lint/format/audit/coverage/license), `package` (publint/attw/`--version`/
      `npm pack --dry-run`), `test` (Node 20/22 × 3 OSes). Same structure as the
      `pexels-mcp-server` sibling project, per the user's explicit request for
      exact parity — every command each job runs was verified locally before
      committing.
- [x] `[v1]` Automated releases (Changesets): version + changelog + npm publish. ✅
      `.changeset/config.json` + `release.yml`: opens/updates a "Version Packages"
      PR on `main` when changesets exist, publishes to npm when that PR merges.
      The actual first publish needs a one-time manual step — see the §2 "protect
      the publish path" note above.
- [x] `[v1]` Conventional commits via commitlint on `commit-msg`. ✅ Already live
      since §0's scaffold (`.husky/commit-msg`).
- [x] `[v1]` npm publish provenance. ✅ `release.yml` sets `NPM_CONFIG_PROVENANCE:
'true'` with `id-token: write` — works alongside the classic `NPM_TOKEN` the
      first release needs, provenance doesn't require OIDC trusted-publishing auth
      specifically, just the `id-token` permission for its own attestation signing.

## 6. Developer & contributor experience

- [x] `[v1]` README: quick start, `npx` one-liner, Claude Desktop/Cursor config, tool
      reference. ✅ Full rewrite — badges, per-client config snippets (Claude Desktop/Code,
      Cursor, VS Code, Windsurf, generic stdio), and the real 4-tool reference table.
      Structure ported from the `pexels-mcp-server` sibling project (not
      `unsplash-mcp-server`, superseded by the pattern established in §5), content
      rewritten for Pixabay's actual surface.
- [x] `[v1]` CONTRIBUTING.md (mirror `unsplash-mcp-server`'s structure: dev setup, scripts
      table, Inspector walkthrough, project conventions, commit/branch rules, versioning
      policy — no `login`/`logout` section needed here). ✅ Mirrors `pexels-mcp-server`'s
      structure instead (same rationale as the README above); no login/logout section, as
      specified.
- [x] `[v1]` CODE_OF_CONDUCT.md. ✅ Standard Contributor Covenant 2.1.
- [x] `[v1]` Issue/PR templates. ✅ Bug report + feature request issue templates (blank
      issues disabled, security advisory contact link), PR template checklist.
- [x] `[v1]` LICENSE confirmed permissive (MIT or similar). ✅ MIT, confirmed since §0.
- [x] `[v1]` SECURITY.md (vulnerability reporting). ✅ Private reporting via GitHub security
      advisories.
- [x] `[v1]` Badges: npm version, build status, license. ✅ README header — npm
      version/downloads, CI status, license, Node version, PRs-welcome.
- [x] `[v1]` Semantic versioning commitment. ✅ README's Roadmap section +
      CONTRIBUTING.md's Versioning & deprecation policy section.
- [x] `[v1]` Explicit no-telemetry / privacy statement ("collects nothing, only contacts
      pixabay.com"). ✅ README's Privacy & security section.
- [x] `[v1]` README troubleshooting section. ✅ Done, plus a matching FAQ section.

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

> Completed early, in the §5 pass — pulled forward because the user asked for exact
> CI/CD parity with the `pexels-mcp-server` sibling project, whose `ci.yml`
> "package" job directly exercises most of these items (`--version`, `publint`/
> `attw`, package.json's publishable shape).

- [x] `[v1]` `bin` entry for `npx` + shebang. ✅ Since §0; tsup's banner adds the
      shebang.
- [x] `[v1]` `files` field ships only `dist/`. ✅ with a note: `files` now explicitly
      lists `["dist", "README.md", "LICENSE"]`, matching the sibling project —
      npm always force-includes README/LICENSE/package.json in the tarball
      regardless of `files`, so the actual shipped contents are identical either
      way (confirmed via `npm pack --dry-run`: 5 files, no source leak). The
      explicit listing is redundant but harmless, not a behavior change.
- [x] `[v1]` Build tooling: **tsup**. ✅ Since §0.
- [x] `[v1]` Cross-platform (macOS/Linux/Windows); `.gitattributes` forcing LF. ✅
      `.gitattributes` added; `ci.yml`'s `test` job matrixes all three OSes.
- [x] `[v1]` Pre-publish package validation in CI: `publint` + `@arethetypeswrong/cli` +
      `npm pack --dry-run`, then a bin smoke test. ✅ `ci.yml`'s `package` job runs
      all four; `node dist/index.js --version` is the bin smoke test.
- [x] `[v1]` Declare `engines.node` + a runtime Node-version guard. ✅ `engines.node`
      since §0; `lib/node-guard.ts`'s `nodeVersionError()`, wired into `index.ts`.
- [x] `[v1]` Support `--version` / `--help` and a TTY guard on the bin. ✅ `index.ts`
      — both flags plus `-v`/`-h`, and a TTY guard printing usage instead of
      hanging when launched interactively.
- [x] `[v1]` Populate `package.json` discoverability metadata (keywords: mcp,
      modelcontextprotocol, pixabay, images, videos, stock-media…). ✅ Added.
- [x] `[v1]` npm name: `@hanoak/pixabay-mcp-server`, bin `pixabay-mcp-server`. ✅
      Since §0.

## 9. Observability (lightweight)

- [x] `[v1]` Optional debug logging to **stderr only** (`src/lib/logger.ts`, `LOG_LEVEL`).
      ✅ Since §0.
- [x] `[v1]` Version/health info via `--version` and the MCP `initialize` response. ✅
      `--version` in `index.ts` (§5 pass); the MCP `initialize` response has
      reported `{name, version}` since `createServer` was first written in §0/§7.

## 10. Docs & maintenance

- [x] `[v1]` CHANGELOG (Changesets-managed) — **no hand-written intro paragraph** (see
      CLAUDE.md's Release process section for why). ✅ Created in §5's Changesets pass —
      missed checking this off at the time; `CHANGELOG.md` has contained exactly
      `# Changelog` since then.
- [x] `[v1]` Compatibility matrix (MCP SDK / Node versions supported). ✅ README's
      "Compatibility" section (added in §6, also missed at the time).
- [x] `[v1]` Deprecation policy for future breaking changes. ✅ CONTRIBUTING.md's
      "Versioning & deprecation policy" section (added in §6, also missed at the time).

## 11. MCP protocol correctness

- [x] `[v1]` Return recoverable failures as `isError: true` tool results, never JSON-RPC
      protocol errors. ✅ Done since §7 (`tools/result.ts`'s `toErrorResult`, empty-search
      handling); confirmed again here since this section wasn't formally reached until now.
- [x] `[v1]` Graceful shutdown + crash safety (stdin EOF / SIGINT / SIGTERM,
      `uncaughtException`/`unhandledRejection`). ✅ Completed early, in the §5 pass, as
      part of the same `index.ts`/`server.ts` port that added `--version`/`--help`.
- [x] `[v1]` Declare tool annotations (`readOnlyHint: true`, `openWorldHint: true`, `title`).
      ✅ `title` since §7; `readOnlyHint`/`openWorldHint` added to all 4 tools in this pass
      — accurate for every tool here (Pixabay's API is entirely read-only and external).
- [x] `[v1]` Namespace tool names (`pixabay_search_images`, not `search_images`). ✅ Done
      since §7.
- [x] `[v1]` Populate the server `instructions` field (default safesearch, courtesy
      attribution, untrusted-text-fields warning). ✅ `SERVER_INSTRUCTIONS` in
      `server.ts`, covering all three; verified delivered over the real transport via
      `client.getInstructions()`.
- [x] `[v1]` Keep tool `inputSchema`s flat and JSON-Schema-safe. ✅ Done since §7.
- [x] `[v1]` Honor MCP request cancellation (`notifications/cancelled` →
      `AbortController`). ✅ Tool handlers now thread the MCP SDK's `extra.signal`
      through to `PixabayClient.searchImages`/`searchVideos`, which combines it with the
      request timeout via `AbortSignal.any` (built ready for this in §3).
- [x] `[v1]` Optional MCP Resources / Prompts (e.g. a licensing/attribution guide resource,
      a "find media for X" prompt covering both images and videos). ✅
      `pixabay://guides/usage` resource + `find_media` prompt (covering both images and
      videos via a `media_type` argument), matching this bullet's own suggestion.

## 12. Content safety & responsible use

- [x] `[v1]` Default `safesearch=true` on search/lookup (overridable). ✅ Done since §7.
- [x] `[v1]` Treat Pixabay text fields (tags, contributor names) as untrusted data /
      indirect prompt-injection surface — label clearly as data; never interpolate into
      privileged/system prompts. ✅ True in code by construction since §7 (nothing ever
      elevates `tags`/`user` into a prompt); now also communicated to the model itself via
      §11's `SERVER_INSTRUCTIONS`, not just to human README readers.

## 13. Discovery & ecosystem

- [x] `[v1]` List on the official MCP registry (`server.json` manifest) + community
      catalogs (Glama, awesome-mcp-servers, mcp.so, PulseMCP). ✅ Published to the
      official registry via `mcp-publisher publish` (GitHub device-flow auth as
      `hanoak`) — `io.github.hanoak/pixabay-mcp-server` v1.0.0 is live at
      registry.modelcontextprotocol.io, status `active`. `glama.json` is already
      committed, so Glama should pick the server up automatically; awesome-mcp-servers/
      mcp.so/PulseMCP listings are manual submissions the project owner can do at
      their own pace — not gated on any further code or CI work.
- [ ] `[post-v1]` Smithery listing — needs a hosted HTTPS URL or a `.mcpb` bundle; defer
      until it's a concrete priority (same call `unsplash-mcp-server` made).

## 14. Governance

- [x] `[v1]` Add CODEOWNERS. ✅ Bundled into §6's community-health-files commit since it's
      one line and directly adjacent — `* @hanoak`.
- [ ] `[post-v1]` `FUNDING.yml` — only if the project actually seeks sponsorship.

---

### ⚠️ Top gotchas

1. Never write logs to **stdout** in a stdio MCP server — it corrupts the JSON-RPC stream.
   All logging → **stderr**. (Enforced mechanically in §4.)
2. Pixabay's API key has **no header option** — it's a `key` query parameter or nothing.
   Treat every URL as radioactive until the redactor has touched it.
3. The 24-hour cache is a **compliance requirement from Pixabay's own terms**, not a
   performance feature you can defer to post-v1.
