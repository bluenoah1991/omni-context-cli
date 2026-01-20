#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import dns from 'node:dns';
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
import { mcpManager } from './services/mcpManager.js';
import {
  addProviderModels,
  getAllModelProviders,
  getModelProvider,
  removeProviderModels,
} from './services/modelProvider.js';
import { initializeProviders } from './services/modelProviders/index.js';
import { loadLatestSession } from './services/sessionManager.js';
import { initializeTools } from './services/tools/index.js';
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
).option('--list-providers', 'List available model providers').parse();

const opts = program.opts();

initializeProviders();

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
mcpManager.initialize();

if (opts.diagnostic) {
  enableDiagnostic();
}

if (opts.costAnalysis) {
  enableCostAnalysis();
}

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

initializeInputHistory();

process.stdout.write('\x1Bc');

render(<ChatView />, {exitOnCtrlC: false});

process.on('exit', () => {
  mcpManager.shutdown();
});
