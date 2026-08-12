import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'

// Spawns the actual built bin (npm test's pretest runs the build first) — stdout is
// the JSON-RPC transport for this stdio MCP server and must never carry anything
// but valid JSON-RPC messages, at any log level.
const distEntry = fileURLToPath(new URL('../dist/index.js', import.meta.url))

let child: ChildProcessWithoutNullStreams | undefined

afterEach(() => {
  child?.kill()
  child = undefined
})

describe('stdout purity', () => {
  it('emits only valid JSON-RPC lines on stdout during a real initialize handshake', async () => {
    child = spawn('node', [distEntry], {
      env: { ...process.env, PIXABAY_API_KEY: 'test-key', LOG_LEVEL: 'debug' },
    })

    const stderrChunks: string[] = []
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk.toString()))

    const rl = createInterface({ input: child.stdout })
    const lines: string[] = []
    const firstLine = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`No stdout line received. stderr so far: ${stderrChunks.join('')}`))
      }, 8000)
      rl.once('line', (line) => {
        clearTimeout(timeout)
        lines.push(line)
        resolve()
      })
    })
    rl.on('line', (line) => lines.push(line))

    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'stdout-purity-test', version: '0.0.0' },
        },
      })}\n`,
    )

    await firstLine
    // Give any stray writes (e.g. an accidental console.log elsewhere in the
    // startup path) a short window to show up before we assert.
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) {
      const parsed: unknown = JSON.parse(line)
      expect(parsed).toMatchObject({ jsonrpc: '2.0' })
    }
  }, 10_000)
})
