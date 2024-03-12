import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), mkcert()],
  server: { https: true },
  build: {
    sourcemap: true,
    assetsInlineLimit: 0
  }
});
