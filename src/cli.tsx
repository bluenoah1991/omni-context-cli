#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import dns from 'node:dns';
import { performance } from 'node:perf_hooks';
import React from 'react';
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici';
import packageJson from '../package.json';
import {
  findModelById,
  initializeCurrentModel,
  setCurrentModel,
} from './services/configManager.js';
import { enableCostAnalysis } from './services/costAnalysis.js';
import { enableDiagnostic } from './services/diagnostic.js';
import { initializeInputHistory } from './services/inputHistoryManager.js';
import { initializeInterceptors } from './services/interceptors/index.js';
import { initializeMCP } from './services/mcpManager.js';
import {
  addProviderModels,
  getAllModelProviders,
  getModelProvider,
  removeProviderModels,
} from './services/modelProvider.js';
import { initializeProviders } from './services/modelProviders/index.js';
import { loadLatestSession } from './services/sessionManager.js';
import { initializeTools } from './services/tools/index.js';
import { startServer } from './services/webServer/index.js';
import { useChatStore } from './store/chatStore.js';
import { ChatView } from './ui/components/ChatView.js';

const program = new Command().name('omx').description('Omni Context CLI').version(
  packageJson.version,
  '-v, --version',
).option('-c, --continue', 'Continue from last session').option(
  '-d, --diagnostic',
  'Enable diagnostic mode to save request/response JSON',
).option('-a, --cost-analysis', 'Record token usage to CSV for cost analysis').option(
  '--add-provider <provider>',
  'Add models from a provider (use --list-providers to see available)',
).option('--remove-provider <provider>', 'Remove all models from a provider').option(
  '--api-key <key>',
  'API key for --add-provider',
).option('--list-providers', 'List available model providers').option(
  '-s, --serve',
  'Start as HTTP server instead of TUI',
).option('-w, --web', 'Open web UI in browser (requires --serve)').option(
  '-p, --port <port>',
  'Port for server mode (default: 5281)',
).option('-H, --host <host>', 'Host for server mode (default: localhost)').option(
  '--parent-pid <pid>',
  'Exit when parent process dies (requires --serve)',
).option('--install-vscode-extension', 'Install VS Code extension').parse();

const opts = program.opts();

initializeProviders();

if (opts.installVscodeExtension) {
  const {execSync} = await import('node:child_process');
  const {existsSync, mkdirSync, writeFileSync} = await import('node:fs');
  const {homedir} = await import('node:os');
  const {dirname, join} = await import('node:path');
  const {fileURLToPath} = await import('node:url');
  const distDir = dirname(fileURLToPath(import.meta.url));
  const vsixPath = join(distDir, 'clients', 'extension.vsix');
  if (!existsSync(vsixPath)) {
    console.error('VS Code extension not found.');
    process.exit(1);
  }
  try {
    execSync(`code --install-extension "${vsixPath}"`, {stdio: 'inherit'});
    const omxDir = join(homedir(), '.omx');
    if (!existsSync(omxDir)) mkdirSync(omxDir, {recursive: true});
    writeFileSync(
      join(omxDir, 'executable'),
      JSON.stringify({node: process.argv[0], script: process.argv[1]}),
      'utf-8',
    );
    console.log('VS Code extension installed successfully.');
  } catch {
    console.error('Failed to install VS Code extension.');
    process.exit(1);
  }
  process.exit(0);
}

if (opts.listProviders) {
  const providers = getAllModelProviders();
  if (providers.length === 0) {
    console.log('No model providers available');
  } else {
    console.log('Available model providers:');
    for (const p of providers) {
      console.log(`  ${p.id} - ${p.name}`);
    }
  }
  process.exit(0);
}

if (opts.addProvider) {
  if (!opts.apiKey) {
    console.error('Error: --api-key is required with --add-provider');
    process.exit(1);
  }
  const provider = getModelProvider(opts.addProvider);
  if (!provider) {
    console.error(`Unknown provider: ${opts.addProvider}`);
    process.exit(1);
  }
  try {
    const count = await addProviderModels(opts.addProvider, opts.apiKey);
    console.log(`Added ${count} models from ${provider.name}`);
  } catch (e) {
    console.error(`Failed to add models: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  process.exit(0);
}

if (opts.removeProvider) {
  const count = removeProviderModels(opts.removeProvider);
  console.log(`Removed ${count} models from ${opts.removeProvider}`);
  process.exit(0);
}

dns.setDefaultResultOrder('ipv4first');

performance.setResourceTimingBufferSize(0);

const agent = new EnvHttpProxyAgent({
  connections: 100,
  pipelining: 10,
  keepAliveTimeout: 60000,
  keepAliveMaxTimeout: 600000,
  allowH2: true,
  maxConcurrentStreams: 100,
});
setGlobalDispatcher(agent);

initializeCurrentModel();
initializeInterceptors();
initializeTools();
initializeInputHistory();
initializeMCP();

if (opts.diagnostic) {
  enableDiagnostic();
}

if (opts.costAnalysis) {
  enableCostAnalysis();
}

if (opts.serve) {
  const port = opts.port ? parseInt(opts.port, 10) : 5281;
  const host = opts.host || 'localhost';
  try {
    await startServer(port, host);
  } catch (err) {
    console.error(`Failed to start server on ${host}:${port}`);
    process.exit(1);
  }
  console.log(`Server running at http://${host}:${port}`);

  if (opts.web) {
    const {exec} = await import('node:child_process');
    const cmd = process.platform === 'win32'
      ? 'start'
      : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
    exec(`${cmd} http://${host}:${port}`);
  }

  if (opts.parentPid) {
    const parentPid = parseInt(opts.parentPid, 10);
    const checkParent = () => {
      try {
        process.kill(parentPid, 0);
      } catch {
        process.exit(0);
      }
    };
    setInterval(checkParent, 2000);
  }

  process.on('SIGINT', () => process.exit(0));
} else {
  if (opts.continue) {
    const session = loadLatestSession();
    if (session?.modelId) {
      const savedModel = findModelById(session.modelId);
      if (savedModel) {
        setCurrentModel(savedModel);
        useChatStore.getState().setSession(session);
      }
    }
  }

  process.stdout.write('\x1Bc');

  render(<ChatView />, {exitOnCtrlC: false});
}
