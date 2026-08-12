# pixabay-mcp-server

An unofficial [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the
[Pixabay API](https://pixabay.com/api/docs/) — search and fetch royalty-free images and videos.

**Unofficial** — this project is not affiliated with, endorsed by, or sponsored by Pixabay.
"Pixabay" is a trademark of its respective owner, referenced here only to describe API
compatibility.

## Getting a Pixabay API key

1. [Sign up](https://pixabay.com/) for a free Pixabay account (or log in if you have one).
2. Your API key is shown on the [API docs page](https://pixabay.com/api/docs/) once logged in —
   no separate approval step for the default tier this server uses.
3. Set it as the `PIXABAY_API_KEY` environment variable before starting this server.

Pixabay also offers an optional, separately-requested "full API access" tier that unlocks a few
additional response fields (`fullHDURL`, `imageURL`, `vectorURL`). This server works fine
without it — those fields are simply absent from results for accounts that don't have it.

By using this server you are using the Pixabay API under your own Pixabay account, and you are
responsible for complying with [Pixabay's Terms of Service](https://pixabay.com/service/terms/),
the [Content License](https://pixabay.com/service/license/), and the usage rules on the
[API docs page](https://pixabay.com/api/docs/) (caching, rate limits, no mass downloads). This
project doesn't change or relax those terms in any way.

## Image & Video URLs

This server returns Pixabay CDN URLs (`previewURL`, `webformatURL`, etc.) directly to the
calling LLM client for display within a single conversation turn. Pixabay's terms prohibit
"permanent hotlinking" of these URLs in an application — content displayed persistently should
be downloaded and rehosted first. We treat one-off, ephemeral display in an LLM conversation as
distinct from that use case, but this is a gray area Pixabay's terms don't explicitly address.
If you are building an application that stores or persistently displays Pixabay content sourced
through this server, download and rehost the assets yourself per Pixabay's terms — don't treat
this server's tool output as a substitute for that.
