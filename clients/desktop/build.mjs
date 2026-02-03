import * as esbuild from 'esbuild'
import { cpSync } from 'fs'

await esbuild.build({
  entryPoints: ['src/main/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'out/main/index.js',
  external: ['electron']
})

await esbuild.build({
  entryPoints: ['src/preload/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: 'out/preload/index.js',
  external: ['electron']
})

cpSync('src/loading.html', 'out/loading.html')

console.log('Build complete')
