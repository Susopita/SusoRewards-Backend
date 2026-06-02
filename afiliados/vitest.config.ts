import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      include: ['src/**/*'],
      exclude: ['src/index.ts', 'src/infrastructure/config/env.ts']
    }
  }
});
