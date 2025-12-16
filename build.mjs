import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const isWatch = process.argv.includes('--watch');

const textLoader = {
  name: 'text-loader',
  setup(build) {
    build.onLoad({ filter: /\.txt$/ }, async (args) => {
      const text = readFileSync(args.path, 'utf8');
      return {
        contents: `export default ${JSON.stringify(text)}`,
        loader: 'js',
      };
    });
  },
};

const buildOptions = {
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.js',
  external: [
    'ink',
    'react',
    'figlet',
    'zustand',
    'ink-spinner',
    'commander',
    'highlight.js',
    'marked',
    'string-width',
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  plugins: [textLoader],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete!');
}
