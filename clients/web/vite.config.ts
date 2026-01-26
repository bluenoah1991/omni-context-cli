import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {outDir: '../../dist/clients/web', emptyOutDir: true},
  server: {proxy: {'/api': 'http://localhost:5281'}},
});
