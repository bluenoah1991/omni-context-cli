import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export function installDaemon(host: string, port: string, tlsCert?: string, tlsKey?: string): void {
  if (process.platform !== 'linux') {
    throw new Error('--install-daemon is only supported on Linux (systemd).');
  }

  const cwd = process.cwd();
  const nodePath = process.execPath;
  const scriptPath = process.argv[1];
  const dirSlug =
    basename(cwd).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(
      /^-|-$/g,
      '',
    ) || 'default';
  const serviceName = `omni-context-${dirSlug}`;
  const user = process.env.USER || process.env.LOGNAME || 'root';
  let execStart = `"${nodePath}" "${scriptPath}" --serve --host ${host} --port ${port}`;
  if (tlsCert && tlsKey) {
    execStart += ` --tls --tls-cert "${tlsCert}" --tls-key "${tlsKey}"`;
  }
  const serviceContent = [
    '[Unit]',
    `Description=OmniContext Web CLI (${cwd})`,
    'After=network.target',
    '',
    '[Service]',
    'Type=simple',
    `User=${user}`,
    `WorkingDirectory=${cwd}`,
    `ExecStart=${execStart}`,
    'Restart=on-failure',
    'RestartSec=5',
    'Environment=NODE_ENV=production',
    '',
    '[Install]',
    'WantedBy=multi-user.target',
    '',
  ].join('\n');

  const servicePath = `/etc/systemd/system/${serviceName}.service`;

  try {
    writeFileSync(servicePath, serviceContent, 'utf-8');
  } catch {
    throw new Error('Permission denied. Try: sudo omx --install-daemon');
  }

  try {
    execSync('systemctl daemon-reload', {stdio: 'inherit'});
    execSync(`systemctl enable --now ${serviceName}`, {stdio: 'inherit'});
    console.log(`\nInstalled and started ${serviceName}.service`);
    console.log(`  Working directory: ${cwd}`);
    console.log(`  Listening on ${host}:${port}`);
    console.log(`\nManage with:`);
    console.log(`  systemctl status ${serviceName}`);
    console.log(`  systemctl stop ${serviceName}`);
    console.log(`  systemctl restart ${serviceName}`);
    console.log(`  journalctl -u ${serviceName} -f`);
  } catch {
    throw new Error(`Failed to install daemon. Service file written to: ${servicePath}`);
  }
}
