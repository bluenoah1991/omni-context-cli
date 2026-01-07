#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import dns from 'node:dns';
import React from 'react';
import { Agent, setGlobalDispatcher } from 'undici';
import {
  findModelById,
  initializeCurrentModel,
  setCurrentModel,
} from './services/configManager.js';
import { enableCostAnalysis } from './services/costAnalysis.js';
import { enableDiagnostic } from './services/diagnostic.js';
import { initializeInterceptors } from './services/interceptors/index.js';
import { mcpManager } from './services/mcpManager.js';
import { loadLatestSession } from './services/sessionManager.js';
import { initializeTools } from './services/tools/index.js';
import { useChatStore } from './store/chatStore.js';
import { ChatView } from './ui/components/ChatView.js';

const program = new Command().name('omx').description('Omni Context CLI').option(
  '-c, --continue',
  'Continue from last session',
).option('-d, --diagnostic', 'Enable diagnostic mode to save request/response JSON').option(
  '-a, --cost-analysis',
  'Record token usage to CSV for cost analysis',
).parse();

const opts = program.opts();

dns.setDefaultResultOrder('ipv4first');

const agent = new Agent({
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

process.stdout.write('\x1Bc');

render(<ChatView />, {exitOnCtrlC: false});

process.on('exit', () => {
  mcpManager.shutdown();
});
