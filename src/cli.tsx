#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import dns from 'node:dns';
import React from 'react';
import { Agent, setGlobalDispatcher } from 'undici';
import {
  findFirstModelByProvider,
  findModelById,
  getAppConfig,
  initializeAppConfig,
  updateAppConfig,
} from './services/configManager.js';
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
).option('-d, --diagnostic', 'Enable diagnostic mode to save request/response JSON').parse();

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

initializeAppConfig();
initializeInterceptors();
initializeTools();
mcpManager.initialize();

if (opts.diagnostic) {
  enableDiagnostic();
}

if (opts.continue) {
  const config = getAppConfig();
  const session = loadLatestSession();
  if (session) {
    if (session.modelId) {
      const savedModel = findModelById(session.modelId);
      if (savedModel) {
        updateAppConfig(
          savedModel,
          config.enableThinking ?? false,
          config.streamingOutput ?? false,
          config.specialistMode ?? false,
        );
      } else {
        const fallbackModel = findFirstModelByProvider(config.provider);
        if (fallbackModel) {
          updateAppConfig(
            fallbackModel,
            config.enableThinking ?? false,
            config.streamingOutput ?? false,
            config.specialistMode ?? false,
          );
        }
      }
    }
    useChatStore.getState().setSession(session);
  }
}

process.stdout.write('\x1Bc');

render(<ChatView />, {exitOnCtrlC: false});

process.on('exit', () => {
  mcpManager.shutdown();
});
