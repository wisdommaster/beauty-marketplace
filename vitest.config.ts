import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: [
      'apps/*/src/**/*.test.ts',
      'packages/*/src/**/*.test.ts',
    ],
    globals: true,
  },
  resolve: {
    alias: {
      '@beauty/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
    },
  },
})
