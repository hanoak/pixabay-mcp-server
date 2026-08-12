# Security Policy

## Supported versions

The latest released version on npm receives security fixes. Only the most recent release is
supported — there are no parallel maintenance branches for older major versions.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report privately via GitHub's
[**"Report a vulnerability"**](https://github.com/hanoak/pixabay-mcp-server/security/advisories/new)
(Security → Advisories → Report a vulnerability). Include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- affected version(s).

We aim to acknowledge reports within a few days, and to release a fix (and a coordinated
advisory) as quickly as is practical.

## Handling your Pixabay API key

This server reads your key **only** from the `PIXABAY_API_KEY` environment variable and:

- sends it only to `pixabay.com`, as the `key` query parameter — Pixabay's API has no header
  alternative, so this is the one place a request necessarily carries it;
- never writes it to logs (all error output is redacted, and logs go to stderr, not the
  JSON-RPC stdout stream);
- never persists it anywhere.

If you believe your key was exposed, regenerate it from your
[Pixabay account](https://pixabay.com/api/docs/).
