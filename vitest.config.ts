import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['src/tests/**/*.test.{ts,tsx}'],
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
  },
});
