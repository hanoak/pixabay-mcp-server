# Contributing

Thanks for your interest in improving `pixabay-mcp-server`! This guide covers the dev setup
and the conventions that keep the codebase consistent.

## Development setup

Requires **Node.js >= 20**.

```bash
git clone https://github.com/hanoak/pixabay-mcp-server.git
cd pixabay-mcp-server
npm install          # also installs git hooks via husky
cp .env.example .env # then add your PIXABAY_API_KEY
```

### Scripts

| Command                 | What it does                                                    |
| ----------------------- | --------------------------------------------------------------- |
| `npm run build`         | Bundle to `dist/` with tsup (ESM + shebang + `.d.ts`).          |
| `npm run typecheck`     | `tsc --noEmit` (strict).                                        |
| `npm run lint`          | ESLint (flat config).                                           |
| `npm run format`        | Prettier write.                                                 |
| `npm test`              | Vitest (unit + in-memory MCP integration tests).                |
| `npm run test:coverage` | Vitest with v8 coverage + thresholds (the coverage gate).       |
| `npm run license:check` | Fail if any production dependency has a non-permissive license. |
| `npm run check`         | typecheck + lint + format:check + test (core local gate).       |
| `npm run check:package` | Build, then `publint` + `attw` — the publishable-shape checks.  |

## Using MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the quickest way to
exercise tools interactively:

```bash
npm run build
PIXABAY_API_KEY=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

Connect, open the **Tools** tab, and run any of the 4 tools (`pixabay_search_images`,
`pixabay_get_image`, `pixabay_search_videos`, `pixabay_get_video`) directly, inspect their
input schemas, and see raw tool results (including `isError` cases). Open the **Resources**
tab to read `pixabay://guides/usage`, or the **Prompts** tab to run `find_media` with sample
arguments and check the generated message text. Server logs (stderr) appear in the terminal
where you launched the Inspector. Rebuild (`npm run build`) after any source change and
restart Inspector to pick it up.

## Project structure & conventions

- **One file per resource domain** under `src/tools/` (`images.ts`, `videos.ts`). Each file
  exposes a `register<Domain>Tools(server, ctx)` registrar that `src/tools/index.ts` calls.
  Adding a tool means editing its domain file — never `server.ts`.
- **Tool input schemas** live in the tool file (zod, kept flat/JSON-Schema-safe — no top-level
  unions, no deep refinements). `src/schemas/` is for **Pixabay response/wire schemas only**,
  and they are intentionally **lenient** (only `id` required; everything else
  optional/nullable) so upstream field changes degrade gracefully.
- **Errors** are mapped to MCP `isError` results via `src/tools/result.ts` — never thrown as
  protocol errors.
- **No secrets in logs.** stdout is the JSON-RPC channel; log only to stderr
  (`src/lib/logger.ts`). All error text runs through the redactor (`src/lib/redact.ts`) since
  Pixabay only accepts the API key as a URL query parameter.
- **The 24h response cache is mandatory**, not optional — every outbound Pixabay GET routes
  through `src/lib/cache.ts`. Don't bypass it "just for this one endpoint."
- **`no-explicit-any`** and **`no-console`** (except `console.error`) are enforced by ESLint.

## Commits & branches

- **Conventional Commits** are enforced by a `commit-msg` hook (`feat:`, `fix:`, `docs:`,
  `chore:`, `refactor:`, `test:`, `ci:` …).
- A `pre-commit` hook runs gitleaks + `lint-staged` (Prettier + ESLint on staged files) and
  blocks direct commits to `main`.
- Open pull requests against `main`; CI must pass — lint, typecheck, format, coverage
  thresholds, a dependency-license check, package validation (`publint` + `attw` + tarball),
  tests on Node 20/22 × Linux/macOS/Windows, and a gitleaks secret scan.

## Versioning & deprecation policy

This project follows [Semantic Versioning](https://semver.org), and
[CHANGELOG.md](./CHANGELOG.md) is Changesets-managed — don't hand-edit past entries or re-add
an intro paragraph (Changesets always inserts new version sections directly after the `#
Changelog` heading). **Tool names, input parameters, and output shapes are part of the public
contract** — an incompatible change to any of them ships only in a **major** release.

When something must change incompatibly, we deprecate before removing: the old behavior is
kept for at least one subsequent **minor** release, called out in the CHANGELOG, and — where
possible — flagged in the tool description. Removal then happens in the next major. Additive
changes (new tools, new optional fields) are minor and backwards-compatible.

## Code of Conduct

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).
