import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'inject-vscode-meta',
    transformIndexHtml: {
      order: 'pre',
      handler() {
        return [{
          tag: 'meta',
          attrs: {'http-equiv': 'Content-Security-Policy', content: '{{OMNI_CONTEXT_CSP}}'},
          injectTo: 'head',
        }, {
          tag: 'meta',
          attrs: {name: 'websession-id', content: '{{OMNI_CONTEXT_WEBSESSION_ID}}'},
          injectTo: 'head',
        }, {
          tag: 'meta',
          attrs: {name: 'server-url', content: '{{OMNI_CONTEXT_SERVER_URL}}'},
          injectTo: 'head',
        }, {tag: 'meta', attrs: {name: 'embed', content: 'true'}, injectTo: 'head'}];
      },
    },
  }],
  experimental: {
    renderBuiltUrl(filename) {
      return '{{OMNI_CONTEXT_BASE_URI}}/' + filename;
    },
  },
  build: {
    outDir: '../vscode/webview',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {drop_console: false, drop_debugger: true},
      mangle: {properties: {regex: /^_private/}},
    },
  },
});
