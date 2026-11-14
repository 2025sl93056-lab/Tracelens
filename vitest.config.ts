import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Resolve workspace packages to their source so tests don't require a prior
// build step. (At build/typecheck time they resolve to dist as usual.)
export default defineConfig({
  resolve: {
    alias: {
      '@tracelens/shared': resolve(import.meta.dirname, 'packages/shared/src/index.ts'),
      '@tracelens/graph': resolve(import.meta.dirname, 'packages/graph/src/index.ts'),
    },
  },
  test: {
    include: ['packages/*/src/**/*.test.{ts,tsx}'],
  },
});
