import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function run(cmd, cwd = root) {
  console.log(`\n> ${cmd}  (${relative(root, cwd) || '.'})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function readVersion(pkgPath) {
  return JSON.parse(readFileSync(resolve(root, pkgPath), 'utf8')).version;
}

function collectFiles(dir) {
  const entries = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) {
      entries.push(...collectFiles(full));
    } else {
      entries.push({ name: relative(dir, full).replace(/\\/g, '/'), data: readFileSync(full) });
    }
  }
  return entries;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZip(outputPath, sourceDir) {
  const entries = collectFiles(sourceDir);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const raw = entry.data;
    const compressed = deflateRawSync(raw, { level: 9 });
    const crc = crc32(raw);

    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    nameBytes.copy(local, 30);

    const chunk = Buffer.concat([local, compressed]);
    localParts.push(chunk);

    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    nameBytes.copy(central, 46);
    centralParts.push(central);

    offset += chunk.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(entries.length, 8);
  endRecord.writeUInt16LE(entries.length, 10);
  endRecord.writeUInt32LE(centralDir.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  writeFileSync(outputPath, Buffer.concat([...localParts, centralDir, endRecord]));
  const size = statSync(outputPath).size;
  console.log(`  -> ${relative(root, outputPath)} (${(size / 1024).toFixed(1)} KB)`);
}

console.log('=== Step 1: Clean ===');
run('npm run clean');

console.log('\n=== Step 2: Build CLI ===');
run('npm run build');

console.log('\n=== Step 3: Build Web (3 targets) ===');
const webDir = resolve(root, 'clients/web');
run('npm run build', webDir);
run('npm run build:vscode', webDir);
run('npm run build:desktop', webDir);

console.log('\n=== Step 4: VS Code Extension ===');
const vscodeDir = resolve(root, 'clients/vscode');
run('npm run dist', vscodeDir);

console.log('\n=== Step 5: Build Office (2 targets) ===');
const officeDir = resolve(root, 'clients/office');
run('npm run build', officeDir);
run('npm run build:desktop', officeDir);

console.log('\n=== Step 6: Build Obsidian, Figma, Browser ===');
run('npm run build', resolve(root, 'clients/obsidian'));
run('npm run build', resolve(root, 'clients/figma'));
run('npm run build', resolve(root, 'clients/browser'));

console.log('\n=== Step 7: Package ===');

const releaseDir = resolve(root, 'release');
rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

const zipTargets = [
  { name: 'omni-context-connect', pkg: 'clients/browser/package.json', dist: 'clients/browser/dist' },
  { name: 'omni-context-figma', pkg: 'clients/figma/package.json', dist: 'clients/figma/dist' },
  { name: 'omni-context-obsidian', pkg: 'clients/obsidian/package.json', dist: 'clients/obsidian/dist' },
];

for (const { name, pkg, dist } of zipTargets) {
  const ver = readVersion(pkg);
  const zipPath = resolve(releaseDir, `${name}-v${ver}.zip`);
  createZip(zipPath, resolve(root, dist));
}

console.log('\n=== Step 8: Package Desktop ===');
const desktopDir = resolve(root, 'clients/desktop');
const packageCmd = process.platform === 'win32' ? 'npm run package:win' : 'npm run package:mac';
run(packageCmd, desktopDir);

console.log('\n=== Step 9: Install VS Code Extension ===');
run('code --install-extension dist/clients/extension.vsix');

console.log('\nDone.');
