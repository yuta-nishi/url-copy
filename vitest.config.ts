import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import plasmoCssPaths from './plugins/plasmo-css-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), plasmoCssPaths()],
  test: {
    include: [
      './src/**/*.test.{ts,tsx}',
      './tests/**/*.test.{ts,tsx}',
      './plugins/**/*.test.{ts,tsx}',
    ],
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    coverage: {
      // Note that the path specification method for test.include is different. The following will not work.
      // include: ['./src/**/*.{ts,tsx}'],
      include: ['src/**/*.{ts,tsx}', 'plugins/**/*.{ts,tsx}'],
      exclude: ['src/components/ui', '**/types/**'],
    },
  },
});
