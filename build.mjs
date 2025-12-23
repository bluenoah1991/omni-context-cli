import * as esbuild from 'esbuild';
import { cpSync, readFileSync, writeFileSync } from 'fs';
import JavaScriptObfuscator from 'javascript-obfuscator';

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

const optionalDepsPlugin = {
  name: 'optional-deps',
  setup(build) {
    build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
      path: 'react-devtools-core',
      namespace: 'optional-deps',
    }));
    build.onLoad({ filter: /.*/, namespace: 'optional-deps' }, () => ({
      contents: 'export default {};',
      loader: 'js',
    }));
  },
};

const buildOptions = {
  entryPoints: ['src/cli.tsx'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/cli.js',
  external: ['figlet'],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  minify: !isWatch,
  sourcemap: isWatch ? 'inline' : false,
  plugins: [textLoader, optionalDepsPlugin],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);

  const code = readFileSync('dist/cli.js', 'utf8');
  const obfuscated = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: false,
    identifierNamesGenerator: 'hexadecimal',
    renameGlobals: false,
    selfDefending: false,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.5,
    transformObjectKeys: false,
    unicodeEscapeSequence: false
  });

  writeFileSync('dist/cli.js', obfuscated.getObfuscatedCode(), 'utf8');

  cpSync('bin', 'dist/bin', { recursive: true });

  console.log('Build complete with obfuscation!');
}
