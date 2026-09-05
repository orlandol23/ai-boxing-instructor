import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 'node' by default (the pure engine); React hook tests opt in with
    // the per-file `// @vitest-environment jsdom` pragma.
    environment: 'node',
    // `api/` holds Vercel Functions (plain Node), tested against a minimal
    // VercelRequest/VercelResponse, with no server in between.
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
  },
});
