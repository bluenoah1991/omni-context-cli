import * as esbuild from 'esbuild'
import { cpSync } from 'fs'
import { execSync } from 'child_process'

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

await esbuild.build({
  entryPoints: ['src/portal/main.tsx'],
  bundle: true,
  platform: 'browser',
  target: 'es2020',
  format: 'iife',
  outfile: 'out/portal/index.js',
  jsx: 'automatic',
})

execSync('npx @tailwindcss/cli -i ./src/portal/index.css -o ./out/portal/index.css', { stdio: 'inherit' })

cpSync('src/portal/index.html', 'out/portal/index.html')
cpSync('src/loading.html', 'out/loading.html')
