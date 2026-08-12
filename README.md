# pixabay-mcp-server

An unofficial [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the
[Pixabay API](https://pixabay.com/api/docs/) — search and fetch royalty-free images and videos.

## Image & Video URLs

This server returns Pixabay CDN URLs (`previewURL`, `webformatURL`, etc.) directly to the
calling LLM client for display within a single conversation turn. Pixabay's terms prohibit
"permanent hotlinking" of these URLs in an application — content displayed persistently should
be downloaded and rehosted first. We treat one-off, ephemeral display in an LLM conversation as
distinct from that use case, but this is a gray area Pixabay's terms don't explicitly address.
If you are building an application that stores or persistently displays Pixabay content sourced
through this server, download and rehost the assets yourself per Pixabay's terms — don't treat
this server's tool output as a substitute for that.
