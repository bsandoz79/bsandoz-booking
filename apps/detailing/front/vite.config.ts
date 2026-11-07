import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const uiSrc = fileURLToPath(new URL('../../../packages/ui/src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@bsandoz/ui': uiSrc },
    dedupe: ['react', 'react-dom'],
  },
});
