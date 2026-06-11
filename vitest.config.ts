import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 'node' por padrão (engine puro); testes de hooks React usam o
    // pragma `// @vitest-environment jsdom` por arquivo.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
