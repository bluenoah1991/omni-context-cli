import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export class LockFileManager {
  private lockFilePath: string | null = null;

  private getLockDir(): string {
    return path.join(os.homedir(), '.omx', 'ide');
  }

  write(port: number, authToken: string): void {
    const lockDir = this.getLockDir();
    if (!fs.existsSync(lockDir)) {
      fs.mkdirSync(lockDir, {recursive: true});
    }
    this.lockFilePath = path.join(lockDir, `${port}.lock`);
    fs.writeFileSync(
      this.lockFilePath,
      JSON.stringify({
        pid: process.pid,
        workspaceFolders: vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath) || [],
        ideName: 'Visual Studio Code',
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
