#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { initializeAppConfig } from './services/configManager.js';
import { initializeInterceptors } from './services/interceptors/index.js';
import { ChatView } from './ui/components/ChatView.js';

initializeAppConfig();
initializeInterceptors();
render(<ChatView />, {exitOnCtrlC: false});
