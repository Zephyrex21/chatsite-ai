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
        // Same reasoning: thin instantiation of the Upstash Redis/Ratelimit
        // clients. The identifier-resolution logic that actually has
        // branching behavior lives in identifier.ts and is fully tested.
        'src/lib/rate-limit/client.ts',
        // Thin Auth.js session wrapper — a single equality check against
        // an env var, calling the already-excluded auth() helper. Nothing
        // here to meaningfully unit test beyond what a mock would assert.
        'src/lib/admin.ts',
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
