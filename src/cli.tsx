#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { initializeAppConfig } from './services/configManager.js';
import { initializeInterceptors } from './services/interceptors/index.js';
import { initializeTools } from './services/tools/index.js';
import { ChatView } from './ui/components/ChatView.js';

initializeAppConfig();
initializeInterceptors();
initializeTools();
render(<ChatView />, {exitOnCtrlC: false});
