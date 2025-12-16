#!/usr/bin/env node
import { Command } from '@commander-js/extra-typings';
import { render } from 'ink';
import React from 'react';
import { getAppConfig, initializeAppConfig } from './services/configManager.js';
import { initializeInterceptors } from './services/interceptors/index.js';
import { loadLatestSession } from './services/sessionManager.js';
import { initializeTools } from './services/tools/index.js';
import { useChatStore } from './store/chatStore.js';
import { ChatView } from './ui/components/ChatView.js';

const program = new Command().name('omx').description('Omni Context CLI').option(
  '-c, --continue',
  'Continue from last session',
).parse();

const opts = program.opts();

initializeAppConfig();
initializeInterceptors();
initializeTools();

if (opts.continue) {
  const config = getAppConfig();
  const session = loadLatestSession(config.provider);
  if (session) {
    useChatStore.getState().setSession(session);
  }
}

render(<ChatView />, {exitOnCtrlC: false});
