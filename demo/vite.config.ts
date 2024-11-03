// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  build: {
    sourcemap: true,
    assetsInlineLimit: 0,
},
}));
