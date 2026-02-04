import { app } from 'electron';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export const isDev = () => !app.isPackaged;

export const getOmxDir = () => join(homedir(), '.omx');

export const getPath = (type: 'cli' | 'webview' | 'icon' | 'portal') => {
  const paths = {
    cli: isDev()
      ? join(__dirname, '../../../../dist/cli.js')
      : join(process.resourcesPath, 'omni-context-cli', 'cli.js'),
    webview: isDev() ? join(__dirname, '../../webview') : join(process.resourcesPath, 'webview'),
    icon: isDev()
      ? join(__dirname, '../../../../assets/cone@256.png')
      : join(process.resourcesPath, 'icon.png'),
    portal: isDev() ? join(__dirname, '../portal') : join(process.resourcesPath, 'portal'),
  };
  return paths[type];
};

export const getDefaultWorkspace = () => {
  const workspace = join(homedir(), 'Documents', 'OmniContext Desktop');
  if (!existsSync(workspace)) {
    mkdirSync(workspace, {recursive: true});
  }
  return workspace;
};
