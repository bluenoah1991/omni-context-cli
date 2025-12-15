#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import { ChatView } from './ui/components/ChatView.js';

render(<ChatView />, {exitOnCtrlC: false});
