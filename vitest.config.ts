import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
      // Regression floor, set just below what the initial suite actually achieves.
      // Raise as the suite grows; never lower it to turn a red build green.
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 90,
        statements: 85,
      },
    },
  },
})
