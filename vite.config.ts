import { defineConfig } from 'vite';

// GitHub Pages serves the project at /<repo-name>/.
export default defineConfig({
  base: '/game-claude/',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
