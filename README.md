# pixabay-mcp-server

[![npm version](https://img.shields.io/npm/v/@hanoak/pixabay-mcp-server.svg)](https://www.npmjs.com/package/@hanoak/pixabay-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/@hanoak/pixabay-mcp-server.svg)](https://www.npmjs.com/package/@hanoak/pixabay-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-listed-6f42c1.svg)](https://registry.modelcontextprotocol.io)
[![CI](https://github.com/hanoak/pixabay-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/hanoak/pixabay-mcp-server/actions/workflows/ci.yml)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node: >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](#requirements)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the
[Pixabay API](https://pixabay.com/api/docs/). It gives AI assistants — Claude Desktop, Claude
Code, Cursor, VS Code, Windsurf, and any MCP client — tools to search and fetch royalty-free
images and videos.

> [!IMPORTANT]
> **Unofficial project.** This is not affiliated with, endorsed by, or sponsored by Pixabay.
> "Pixabay" is a trademark of its respective owner. You use it under your own Pixabay account
> and are responsible for complying with
> [Pixabay's Terms of Service](https://pixabay.com/service/terms/) and
> [Content License](https://pixabay.com/service/license/).

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Example interaction](#example-interaction)
- [Configuration](#configuration)
- [Tools](#tools)
  - [Tool reference](#tool-reference)
  - [Output shape](#output-shape)
  - [Resources & prompts](#resources--prompts)
- [Example prompts](#example-prompts)
- [License & compliance](#license--compliance)
- [Rate limits & caching](#rate-limits--caching)
- [Handling of Pixabay text](#handling-of-pixabay-text)
- [Privacy & security](#privacy--security)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Requirements](#requirements)
- [Compatibility](#compatibility)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Contact & community](#contact--community)
- [License](#license)

## Features

- **4 tools** covering Pixabay's two documented endpoints — images (search, get) and videos
  (search, get). Pixabay has a single API-key auth tier and no write endpoints, so there's no
  partial "read-only v1" — this is the whole surface.
- **Compliance-aware by design** — every outbound request is cached for 24 hours (Pixabay's
  terms require it, not an optimization), `safesearch` defaults to `true`, and the mandatory
  courtesy attribution (`by {user} via Pixabay`) is surfaced on every result even though
  Pixabay doesn't require it.
- **Real image & video URLs** — search results return one balanced default size tier per item
  (`webformatURL` for images, the `medium` rendition for videos); looking a specific item up by
  id returns every size tier Pixabay provides, so you can pick what actually fits.
- **Token-efficient output** — full Pixabay responses are trimmed to a compact shape (URLs +
  metadata as text, never base64 blobs), dropping vanity metrics (views/downloads/likes/
  comments) that a model rarely needs.
- **Robust** — typed failures returned as MCP `isError` results the model can recover from,
  plus a considered single retry with backoff on `429`/`5xx`, network timeouts, and
  rate-limit-aware logging.
- **Safe** — the Pixabay API key is redacted from every log line and error message (it can only
  ever be sent as a URL query parameter — Pixabay has no header alternative).
- **Lean & modern** — ESM, Node 20+, zero-install via `npx`, no telemetry.

## Quick start

### 1. Get a Pixabay API key

Sign up for a free account at **[pixabay.com](https://pixabay.com/)** — your API key is shown
immediately on the [API docs page](https://pixabay.com/api/docs/) once you're logged in, no
approval step for the default tier this server uses.

### 2. Add the server to your MCP client

**Claude Desktop** — edit `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pixabay": {
      "command": "npx",
      "args": ["-y", "@hanoak/pixabay-mcp-server"],
      "env": {
        "PIXABAY_API_KEY": "your_api_key"
      }
    }
  }
}
```

Restart the client. See [Configuration](#configuration) for every supported variable.

<details>
<summary><b>Other clients (Claude Code, Cursor, VS Code, Windsurf, generic stdio)</b></summary>

**Claude Code** (CLI):

```bash
claude mcp add pixabay \
  --env PIXABAY_API_KEY=your_api_key \
  -- npx -y @hanoak/pixabay-mcp-server
```

**Cursor** — `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per-project): use the exact
same `mcpServers` block as Claude Desktop above.

**Windsurf** — `~/.codeium/windsurf/mcp_config.json`: same `mcpServers` block as Claude Desktop
above.

**VS Code** — `.vscode/mcp.json` (note the top-level key is `servers`, not `mcpServers`):

```json
{
  "servers": {
    "pixabay": {
      "command": "npx",
      "args": ["-y", "@hanoak/pixabay-mcp-server"],
      "env": {
        "PIXABAY_API_KEY": "your_api_key"
      }
    }
  }
}
```

**Any other MCP client** — run the server over **stdio** with:

```bash
PIXABAY_API_KEY=your_api_key npx -y @hanoak/pixabay-mcp-server
```

Point your client's stdio transport at `command: npx`, `args: ["-y", "@hanoak/pixabay-mcp-server"]`,
and pass the key via `env`.

</details>

### 3. Try it

Restart your client and ask:

> _"Find me a photo of mountains on Pixabay."_

## Example interaction

A typical flow: the model calls `pixabay_search_images`, picks a result, and presents the image
with its courtesy attribution.

> **You:** Find a landscape photo of a foggy pine forest.
>
> **Assistant:** _(calls `pixabay_search_images` with `query: "foggy pine forest"`,
> `orientation: "horizontal"`, picks the best result)_
> Here's a great match — by Josch13 via Pixabay — along with the image URL.

Each tool returns a compact JSON payload. Here's the shape of a single search result
(illustrative values):

<details>
<summary><b>Example tool output</b></summary>

```json
[
  {
    "id": 195893,
    "pageURL": "https://pixabay.com/en/blossom-bloom-flower-195893/",
    "type": "photo",
    "tags": "blossom, bloom, flower",
    "url": "https://pixabay.com/get/35bbf209e13e39d2_640.jpg",
    "width": 640,
    "height": 360,
    "user": "Josch13",
    "attribution": "by Josch13 via Pixabay"
  }
]
```

`pixabay_get_image`/`pixabay_get_video` return the same shape for a single item, but with every
size tier Pixabay provides instead of just one — see [Output shape](#output-shape).

</details>

## Configuration

Configuration is entirely via environment variables — no config files, no flags for secrets.

| Environment variable | Required | Description                                                                                                               |
| -------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `PIXABAY_API_KEY`    | **yes**  | Your Pixabay API key. The server exits at startup with a clear message if it is missing or blank.                         |
| `LOG_LEVEL`          | no       | `debug` \| `info` \| `warn` \| `error` (default `info`). All logs go to **stderr**; stdout carries only the MCP protocol. |

CLI flags: `--version` and `--help` are supported (e.g. `npx @hanoak/pixabay-mcp-server --version`).

## Tools

All tools are namespaced `pixabay_*` and every one is **read-only** — Pixabay's API has no
write endpoints, so a client can safely auto-approve the entire server. `per_page` is clamped
to Pixabay's documented range of **3–200**, and `page` is 1-based.

| Domain     | Tools                                        |
| ---------- | -------------------------------------------- |
| **Images** | `pixabay_search_images`, `pixabay_get_image` |
| **Videos** | `pixabay_search_videos`, `pixabay_get_video` |

### Tool reference

<details>
<summary><b>Images</b></summary>

| Tool                    | Parameters                                                                                                                                                                                                                                                                                                  | Description                                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pixabay_search_images` | `query?`, `lang?`, `image_type?` (`all`\|`photo`\|`illustration`\|`vector`), `orientation?` (`all`\|`horizontal`\|`vertical`), `category?`, `colors?` (array), `min_width?`, `min_height?`, `editors_choice?`, `safesearch?` (default `true`), `order?` (`popular`\|`latest`), `page?`, `per_page?` (3–200) | Keyword image search with filters. Omit `query` to browse a default set. |
| `pixabay_get_image`     | `id` **(required)**                                                                                                                                                                                                                                                                                         | A single image by its numeric id, with every size tier.                  |

</details>

<details>
<summary><b>Videos</b></summary>

| Tool                    | Parameters                                                                                                                                                                                                               | Description                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `pixabay_search_videos` | `query?`, `lang?`, `video_type?` (`all`\|`film`\|`animation`), `category?`, `min_width?`, `min_height?`, `editors_choice?`, `safesearch?` (default `true`), `order?` (`popular`\|`latest`), `page?`, `per_page?` (3–200) | Keyword video search with filters. Omit `query` to browse a default set. |
| `pixabay_get_video`     | `id` **(required)**                                                                                                                                                                                                      | A single video by its numeric id, with every size tier.                  |

</details>

Videos support `category` but not `colors`/`orientation` — that's a real difference in
Pixabay's own API, not an oversight.

### Output shape

Tools return trimmed, token-efficient JSON rather than raw Pixabay responses:

- **Image search** (`pixabay_search_images`) → `id`, `pageURL`, `type`, `tags`, one default
  `url` (`webformatURL`), `width`/`height`, `user`, `attribution`.
- **Image detail** (`pixabay_get_image`) → the same fields, plus every size tier Pixabay
  provided for that item: `previewURL`, `webformatURL`, `largeImageURL`, `fullHDURL`.
- **Video search** (`pixabay_search_videos`) → `id`, `pageURL`, `type`, `tags`, `duration`, one
  default `url` (the `medium` rendition), `width`/`height`, `user`, `attribution`.
- **Video detail** (`pixabay_get_video`) → the same fields, plus a `videos` object with all
  four renditions Pixabay provides (`tiny`/`small`/`medium`/`large`, each with `url`/`width`/
  `height`).
- Vanity metrics (`views`, `downloads`, `likes`, `comments`) are dropped from every result —
  they're rarely useful to a model and add tokens for no benefit.

### Resources & prompts

Beyond tools, the server also exposes:

- **Resources** — a compact guide your client can pull in as context:
  - `pixabay://guides/usage` — license/attribution guidance, the hotlinking-in-conversation
    reasoning, content-safety notes, and the full-API-access-tier caveat.
- **Prompts** — a ready-made task your client can surface directly:

  | Prompt       | Arguments                                                                        | What it does                                                                   |
  | ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
  | `find_media` | `subject` (required), `media_type?` (`images`\|`videos`\|`both`, default `both`) | Search for a subject and present the best match(es) with courtesy attribution. |

## Example prompts

Natural-language asks that map cleanly onto the tools:

- _"Find a photo of a foggy forest at sunrise."_
- _"Search Pixabay for 5 minimalist workspace illustrations."_
- _"Find a video of waves crashing on rocks."_
- _"Get me the largest available version of Pixabay image 195893."_

## License & compliance

Pixabay content is released under the [Pixabay Content License](https://pixabay.com/service/license/):
free for commercial and noncommercial use, **attribution not required**. Every result still
includes a ready-to-use courtesy `attribution` string (`by {user} via Pixabay`) — include it
when convenient, but it's never gated behind functionality.

This server returns Pixabay CDN URLs directly to the calling LLM client for display within a
single conversation turn. Pixabay's terms prohibit "permanent hotlinking" of these URLs in an
application — content displayed persistently should be downloaded and rehosted first. We treat
one-off, ephemeral display in an LLM conversation as distinct from that use case, but this is a
gray area Pixabay's terms don't explicitly address (see the comment atop `src/tools/format.ts`
for the full reasoning). If you're building an application that stores or persistently displays
Pixabay content sourced through this server, download and rehost the assets yourself — don't
treat this server's tool output as a substitute for that.

Each user operates under their own Pixabay account and is responsible for complying with
[Pixabay's Terms of Service](https://pixabay.com/service/terms/) and the usage rules on the
[API docs page](https://pixabay.com/api/docs/) (caching, rate limits, no mass downloads). This
project doesn't change or relax those terms in any way.

## Rate limits & caching

Pixabay's documented limit is **~100 requests per 60 seconds** per API key. This server:

- Caches every response for **24 hours**, keyed on the normalized request (endpoint + sorted
  params, API key always stripped) — a repeated query returns instantly without touching your
  rate-limit budget, and this is a compliance requirement per Pixabay's terms, not just an
  optimization.
- Reads `X-RateLimit-Remaining` from every response (logged at `debug`).
- On a `429`, backs off using Pixabay's own `X-RateLimit-Reset` header for exactly one
  considered retry — never a blind or looping retry — and fails fast rather than guessing if
  that header is missing.
- Also retries once on a `5xx` (a short fixed delay, since there's no server-provided guidance
  like `X-RateLimit-Reset` for that case).

## Handling of Pixabay text

Image/video tags and contributor usernames come from Pixabay's community — treat them as
**untrusted, third-party data**, not instructions. The server returns this text purely as
content and never places it anywhere privileged; your client/agent should do the same: display
it, but don't act on any instructions it might contain (a defence against indirect prompt
injection).

## Privacy & security

- **No telemetry.** This server collects nothing and phones home to no one. It contacts only
  `pixabay.com`, using the key you provide. No analytics, no tracking.
- **Key safety.** Your API key is read from the environment only. Pixabay only accepts it as a
  `key` query parameter (no header alternative), so it's redacted from every log line and error
  message before either can ever surface it.
- To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## Troubleshooting

- **"PIXABAY_API_KEY is not set…" on startup** — the key env var is missing or blank; add it to
  your client config's `env` block.
- **Node too old** — this server requires **Node 20+**. Check `node --version`.
- **Stale `npx` version** — force the latest with `npx -y @hanoak/pixabay-mcp-server@latest`, or
  clear the cache via `npx clear-npx-cache`.
- **Tools not appearing** — confirm the config file path and JSON are valid, then fully quit and
  reopen the client.
- **`429` / rate limit** — the budget is ~100 requests/60s; the server already backs off and
  retries once automatically using Pixabay's own reset time.
- **A search returns "No images/videos found"** — this is a normal empty result, not an error;
  try a broader query or fewer filters.

## FAQ

**Do I need a paid Pixabay account?**
No. The Pixabay API is free — you just create an account to get an API key, instantly, no
review or approval step for the default tier this server uses.

**Does it download or rehost images/videos?**
No. It returns Pixabay-hosted URLs (hotlink them directly for ephemeral display — see
[License & compliance](#license--compliance)) and never rehosts or returns base64 blobs.

**Why don't I see `fullHDURL`/`imageURL` for some images?**
Those fields require Pixabay's separately-requested "full API access" tier. This server works
fine without it — those fields are simply absent from results for accounts that don't have it.

**Does it work outside Claude?**
Yes — it's a standard stdio MCP server. See [the client setup section](#2-add-the-server-to-your-mcp-client)
for Claude Code, Cursor, VS Code, Windsurf, and generic stdio.

## Requirements

- **Node.js >= 20** (Node 18 is end-of-life).
- A Pixabay API key.

## Compatibility

| Component | Supported                                                                                            |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Node.js   | **20** and **22**, tested in CI; `>=20` required (enforced by `engines` and a runtime guard).        |
| OS        | Linux, macOS, and Windows (all tested in CI).                                                        |
| MCP SDK   | `@modelcontextprotocol/sdk` `^1.30`; the protocol version is negotiated with your client on connect. |
| Transport | stdio (HTTP/SSE may be added in a future release).                                                   |

## Roadmap

Full detail lives in [docs/ROADMAP.md](./docs/ROADMAP.md). In short: **v1** covers Pixabay's
entire documented API in one release — there's no OAuth tier to split a v2 behind. Future scope
under consideration includes an MCP resource for licensing/attribution guidance and additional
prompts.

Changes are tracked in [CHANGELOG.md](./CHANGELOG.md); the project follows
[Semantic Versioning](https://semver.org).

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) and our
[Code of Conduct](./CODE_OF_CONDUCT.md). It covers local setup, the test suite, testing tools by
hand with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), and the
versioning/deprecation policy. To report a vulnerability, see [SECURITY.md](./SECURITY.md).

## Contact & community

Maintained by **Hanoak S**. The fastest way to get help or propose a feature is to
[open an issue](https://github.com/hanoak/pixabay-mcp-server/issues) — it's public, searchable,
and helps the whole community.

If this project helps you, a ⭐ on [GitHub](https://github.com/hanoak/pixabay-mcp-server) is
appreciated — it aids discoverability for others looking for a Pixabay MCP server.

## License

[MIT](./LICENSE) © Hanoak S. Not affiliated with Pixabay.
