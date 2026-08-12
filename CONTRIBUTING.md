# Contributing

## Using MCP Inspector

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) is the standard way to
manually exercise this server's tools during development, outside of a real MCP client.

```sh
npm run build
PIXABAY_API_KEY=your-key npx @modelcontextprotocol/inspector node dist/index.js
```

This opens a local web UI where you can call `pixabay_search_images`, `pixabay_get_image`,
`pixabay_search_videos`, and `pixabay_get_video` directly, inspect their input schemas, and see
raw tool results (including `isError` cases) without wiring up a full LLM client. Rebuild
(`npm run build`) after any source change and restart Inspector to pick it up.

The rest of this document (dev setup, scripts, project conventions, commit/branch rules,
versioning policy) is still being written — see `docs/ROADMAP.md` §6.
