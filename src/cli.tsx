#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { initializeInterceptors } from './services/interceptors/index.js';
import { ChatView } from './ui/components/ChatView.js';

initializeInterceptors();
render(<ChatView />, {exitOnCtrlC: false});
