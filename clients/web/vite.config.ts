import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    outDir: '../../dist/clients/web',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {drop_console: false, drop_debugger: true},
      mangle: {properties: {regex: /^_private/}},
    },
  },
  server: {proxy: {'/api': 'http://localhost:5281'}},
});
