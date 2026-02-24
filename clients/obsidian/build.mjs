import { cpSync, mkdirSync } from 'fs';
import { build, context } from 'esbuild';

const outdir = 'dist/omni-context';

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: `${outdir}/main.js`,
  external: [
    'obsidian',
    'electron',
    '@codemirror/autocomplete',
    '@codemirror/collab',
    '@codemirror/commands',
    '@codemirror/language',
    '@codemirror/lint',
    '@codemirror/search',
    '@codemirror/state',
    '@codemirror/view',
  ],
  format: 'cjs',
  platform: 'node',
};

function copyAssets() {
  mkdirSync(outdir, { recursive: true });
  cpSync('manifest.json', `${outdir}/manifest.json`);
  cpSync('styles.css', `${outdir}/styles.css`);
}

const dev = process.argv.includes('--dev');

if (dev) {
  copyAssets();
  const ctx = await context({ ...options, sourcemap: true });
  await ctx.watch();
} else {
  await build({ ...options, minify: true });
  copyAssets();
}
