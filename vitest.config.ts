import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**'],
      exclude: [
        'src/lib/**/*.d.ts',
        // Thin Prisma wrappers: meaningful coverage here needs a real test
        // database or heavy mocking, neither of which is worth faking just
        // to inflate a percentage. Exercised via the real dev DB instead.
        'src/lib/repositories/**',
        // Wraps the official Gemini SDK directly. Mocking the SDK's
        // internal transport would mean asserting against my own
        // assumptions of its wire format rather than reality — verified
        // via a manual smoke test with a real API key instead (see README).
        'src/lib/ai/gemini-client.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
