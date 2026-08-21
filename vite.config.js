import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'public',
  build: {
    target: 'es2022',
    sourcemap: false,
    cssMinify: true,
    rollupOptions: {
      input: {
        landing: 'index.html',
        app: 'app.html',
        guardian: 'guardian.html'
      }
    }
  }
});
