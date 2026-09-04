import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 'node' por padrão (engine puro); testes de hooks React usam o
    // pragma `// @vitest-environment jsdom` por arquivo.
    environment: 'node',
    // `api/` são Vercel Functions (Node puro), testadas com um
    // VercelRequest/VercelResponse mínimo — sem servidor no meio.
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
  },
});
