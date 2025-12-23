#!/usr/bin/env node

import { chmodSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const binDir = join(__dirname, '..', 'dist', 'bin');

if (!existsSync(binDir)) {
  process.exit(0);
}

function fixPermissions(dir) {
  const {readdirSync, statSync} = require('fs');
  const {join} = require('path');

  const files = readdirSync(dir);
  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      fixPermissions(filePath);
    } else if (stat.isFile()) {
      if (!file.includes('.') || file.endsWith('.exe')) {
        chmodSync(filePath, 0o755);
      }
    }
  }
}

try {
  fixPermissions(binDir);
} catch (err) {
  process.exit(0);
}
