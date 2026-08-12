import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url))
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
  name: string
  version: string
}

export const name = packageJson.name
export const version = packageJson.version

// The bin/CLI name, distinct from `name` (the scoped npm package name) — used in
// --help/--version output and as the log-line prefix.
export const BIN_NAME = 'pixabay-mcp-server'
