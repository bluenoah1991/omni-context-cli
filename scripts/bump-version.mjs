import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const part = process.argv[2] || 'patch';
if (!['patch', 'minor', 'major'].includes(part)) {
  console.error(`Usage: node scripts/bump-version.mjs [patch|minor|major]`);
  process.exit(1);
}

function bump(version) {
  const parts = version.split('.').map(Number);
  const idx = part === 'major' ? 0 : part === 'minor' ? 1 : 2;
  parts[idx]++;
  for (let i = idx + 1; i < parts.length; i++) parts[i] = 0;
  return parts.join('.');
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  const raw = readFileSync(filePath, 'utf8');
  const indent = raw.match(/^(\s+)/m)?.[1] || '  ';
  writeFileSync(filePath, JSON.stringify(obj, null, indent) + '\n');
}

const packages = [
  'package.json',
  'clients/browser/package.json',
  'clients/desktop/package.json',
  'clients/figma/package.json',
  'clients/obsidian/package.json',
  'clients/office/package.json',
  'clients/vscode/package.json',
  'clients/web/package.json',
];

const manifests = [
  { path: 'clients/obsidian/manifest.json', source: 'clients/obsidian/package.json' },
  { path: 'clients/browser/public/manifest.json', source: 'clients/browser/package.json' },
];

console.log(`Bumping ${part} version...\n`);

const versions = {};
for (const pkg of packages) {
  const filePath = resolve(root, pkg);
  const obj = readJson(filePath);
  const oldVer = obj.version;
  const newVer = bump(oldVer);
  obj.version = newVer;
  writeJson(filePath, obj);
  versions[pkg] = newVer;
  console.log(`  ${pkg}: ${oldVer} -> ${newVer}`);
}

for (const pkg of packages) {
  const lockPath = resolve(root, pkg.replace('package.json', 'package-lock.json'));
  try {
    const obj = readJson(lockPath);
    obj.version = versions[pkg];
    if (obj.packages?.['']) obj.packages[''].version = versions[pkg];
    writeJson(lockPath, obj);
  } catch {}
}

for (const { path: mPath, source } of manifests) {
  const filePath = resolve(root, mPath);
  try {
    const obj = readJson(filePath);
    obj.version = versions[source];
    writeJson(filePath, obj);
    console.log(`  ${mPath}: -> ${versions[source]}`);
  } catch {}
}

console.log(`\nRunning npm install...`);
execSync('npm install', { cwd: root, stdio: 'inherit' });

console.log(`\nDone.`);
