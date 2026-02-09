import { execSync } from 'child_process';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { createServer, Server } from 'https';
import { homedir } from 'os';
import { extname, join } from 'path';
import selfsigned from 'selfsigned';
import { getOmxDir, getPath } from './paths';

const PORT = 52810;
const CERT_DIR = join(homedir(), '.office-addin-dev-certs');
const MANIFEST_DIR = join(getOmxDir(), 'office');
const MANIFEST_PATH = join(MANIFEST_DIR, 'manifest.xml');
const ADDIN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const REG_KEY = 'HKCU\\Software\\Microsoft\\Office\\16.0\\WEF\\Developer';

let server: Server | null = null;
let portInUse = false;

export interface OfficeAddinStatus {
  installed: boolean;
  running: boolean;
  port: number;
}

export function getStatus(): OfficeAddinStatus {
  return {installed: isInstalled(), running: server !== null || portInUse, port: PORT};
}

function isInstalled(): boolean {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`reg query "${REG_KEY}"`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return out.includes(ADDIN_ID);
    } catch {
      return false;
    }
  }
  return existsSync(
    join(homedir(), 'Library/Containers/com.microsoft.Word/Data/Documents/wef/manifest.xml'),
  );
}

function ensureCerts(): {key: string; cert: string; ca?: string;} {
  const keyPath = join(CERT_DIR, 'localhost.key');
  const certPath = join(CERT_DIR, 'localhost.crt');
  const caPath = join(CERT_DIR, 'ca.crt');

  if (existsSync(keyPath) && existsSync(certPath)) {
    return {
      key: readFileSync(keyPath, 'utf-8'),
      cert: readFileSync(certPath, 'utf-8'),
      ca: existsSync(caPath) ? readFileSync(caPath, 'utf-8') : undefined,
    };
  }

  mkdirSync(CERT_DIR, {recursive: true});

  const pems = selfsigned.generate([{name: 'commonName', value: 'localhost'}], {
    keySize: 2048,
    days: 825,
    algorithm: 'sha256',
    extensions: [{
      name: 'subjectAltName',
      altNames: [{type: 2, value: 'localhost'}, {type: 7, ip: '127.0.0.1'}],
    }],
  });

  writeFileSync(keyPath, pems.private);
  writeFileSync(certPath, pems.cert);

  if (process.platform === 'win32') {
    try {
      execSync(`certutil -user -addstore Root "${certPath}"`, {stdio: 'pipe'});
    } catch {}
  } else if (process.platform === 'darwin') {
    try {
      const keychain = join(homedir(), 'Library/Keychains/login.keychain-db');
      execSync(`security add-trusted-cert -r trustRoot -k "${keychain}" "${certPath}"`, {
        stdio: 'pipe',
      });
    } catch {}
  }

  return {key: pems.private, cert: pems.cert};
}

function generateManifest(): string {
  const templatePath = join(getPath('officeDist'), 'manifest.template.xml');
  const template = readFileSync(templatePath, 'utf-8');
  return template.replaceAll('{{BASE_URL}}', `https://localhost:${PORT}`);
}

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.xml': 'application/xml',
};

export async function startServer(): Promise<void> {
  if (server) return;
  const distPath = getPath('officeDist');
  if (!existsSync(distPath)) return;

  const certs = ensureCerts();
  const tlsOptions: Record<string, string> = {key: certs.key, cert: certs.cert};
  if (certs.ca) tlsOptions.ca = certs.ca;
  server = createServer(tlsOptions, (req, res) => {
    const url = (req.url || '/').split('?')[0];
    const filePath = join(distPath, url);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    createReadStream(filePath).pipe(res);
  });

  return new Promise(resolve => {
    server!.on('error', (err: NodeJS.ErrnoException) => {
      server = null;
      if (err.code === 'EADDRINUSE') {
        portInUse = true;
      }
      resolve();
    });
    server!.listen(PORT, () => resolve());
  });
}

export function stopServer(): void {
  server?.close();
  server = null;
  portInUse = false;
}

function sideload(): void {
  if (process.platform === 'win32') {
    execSync(`reg add "${REG_KEY}" /v "${ADDIN_ID}" /t REG_SZ /d "${MANIFEST_PATH}" /f`, {
      stdio: 'pipe',
    });
  } else if (process.platform === 'darwin') {
    for (const app of ['Word', 'Excel', 'Powerpoint']) {
      const dir = join(homedir(), `Library/Containers/com.microsoft.${app}/Data/Documents/wef`);
      mkdirSync(dir, {recursive: true});
      writeFileSync(join(dir, 'manifest.xml'), readFileSync(MANIFEST_PATH));
    }
  }
}

function unsideload(): void {
  if (process.platform === 'win32') {
    try {
      execSync(`reg delete "${REG_KEY}" /v "${ADDIN_ID}" /f`, {stdio: 'pipe'});
    } catch {}
  } else if (process.platform === 'darwin') {
    for (const app of ['Word', 'Excel', 'Powerpoint']) {
      const p = join(
        homedir(),
        `Library/Containers/com.microsoft.${app}/Data/Documents/wef/manifest.xml`,
      );
      if (existsSync(p)) unlinkSync(p);
    }
  }
}

export async function install(): Promise<{success: boolean; error?: string;}> {
  try {
    mkdirSync(MANIFEST_DIR, {recursive: true});
    writeFileSync(MANIFEST_PATH, generateManifest());
    await startServer();
    sideload();
    return {success: true};
  } catch (err: any) {
    return {success: false, error: err?.message || String(err)};
  }
}

export async function uninstall(): Promise<{success: boolean; error?: string;}> {
  try {
    unsideload();
    stopServer();
    if (existsSync(MANIFEST_PATH)) unlinkSync(MANIFEST_PATH);
    return {success: true};
  } catch (err: any) {
    return {success: false, error: err?.message || String(err)};
  }
}
