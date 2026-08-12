import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const packageJsonPath = fileURLToPath(new URL('../package.json', import.meta.url))
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
  name: string
  version: string
}

export const name = packageJson.name
export const version = packageJson.version
