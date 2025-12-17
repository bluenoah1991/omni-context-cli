#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import React from 'react';
import {
  findFirstModelByProvider,
  findModelById,
  getAppConfig,
  initializeAppConfig,
  updateAppConfig,
} from './services/configManager.js';
import { enableDiagnostic } from './services/diagnostic.js';
import { initializeInterceptors } from './services/interceptors/index.js';
import { loadLatestSession } from './services/sessionManager.js';
import { initializeTools } from './services/tools/index.js';
import { useChatStore } from './store/chatStore.js';
import { ChatView } from './ui/components/ChatView.js';

const program = new Command().name('omx').description('Omni Context CLI').option(
  '-c, --continue',
  'Continue from last session',
).option('-d, --diagnostic', 'Enable diagnostic mode to save request/response JSON').parse();

const opts = program.opts();

initializeAppConfig();
initializeInterceptors();
initializeTools();

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
        updateAppConfig(savedModel, config.enableThinking ?? false);
      } else {
        const fallbackModel = findFirstModelByProvider(config.provider);
        if (fallbackModel) {
          updateAppConfig(fallbackModel, config.enableThinking ?? false);
        }
      }
    }
    useChatStore.getState().setSession(session);
  }
}

render(<ChatView />, {exitOnCtrlC: false});
