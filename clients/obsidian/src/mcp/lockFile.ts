import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export class LockFileManager {
  private lockFilePath: string | null = null;

  private getLockDir(): string {
    return path.join(os.homedir(), '.omx', 'ide');
  }

  write(port: number, authToken: string, vaultPath: string): void {
    const lockDir = this.getLockDir();
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, {recursive: true});
    }
    this.lockFilePath = path.join(lockDir, `${port}.lock`);
    fs.writeFileSync(
      this.lockFilePath,
      JSON.stringify({
        pid: process.pid,
        workspaceFolders: vaultPath ? [vaultPath] : [],
        ideName: 'Obsidian',
        transport: 'ws',
        authToken,
      }),
    );
  }

  remove(): void {
    if (this.lockFilePath && fs.existsSync(this.lockFilePath)) {
      try {
        fs.unlinkSync(this.lockFilePath);
      } catch {}
    }
    this.lockFilePath = null;
  }
}
