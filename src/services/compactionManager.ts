import {
  buildSummaryInjectionPrompt,
  buildSummaryPrompt,
} from '../prompts/compactionPromptBuilder';
import { ModelConfig, Provider } from '../types/config';
import { ChatMessage, Session } from '../types/session';
import { distillMessages, getLastResponse } from '../utils/messageUtils';
import { runConversation } from './chatOrchestrator';
import { loadAppConfig } from './configManager';
import { addUserMessage, createSession } from './sessionManager';

const AUTOCOMPACT_THRESHOLD = 0.8;

export function shouldAutoCompact(model: ModelConfig, session: Session): boolean {
  if (loadAppConfig().serverCompaction) return false;
  const maxContextWindow = (model.contextSize || 200) * 1024;
  const maxAllowedTokens = Math.floor(maxContextWindow * AUTOCOMPACT_THRESHOLD);
  const currentTokens = (session.inputTokens ?? 0) + (session.outputTokens ?? 0);
  return currentTokens >= maxAllowedTokens;
}

function extractSummaryFromResponse(response: string): string {
  const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/);
  if (summaryMatch) {
    return summaryMatch[1].trim();
  }
  return response;
}

export async function generateSummary(
  model: ModelConfig,
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const conversationHistory = distillMessages(messages);
  const promptText = buildSummaryPrompt(conversationHistory);

  const summarySession = createSession(model);
  const sessionWithPrompt = addUserMessage(summarySession, promptText, model.provider);

  const resultSession = await runConversation(
    sessionWithPrompt,
    undefined,
    signal,
    {excludeAgents: true, excludeMcp: true, allowedTools: [], additionalTools: null},
    model,
    true,
    true,
    true,
  );

  const responseContent = getLastResponse(resultSession);
  return extractSummaryFromResponse(responseContent);
}

export function injectSummary(session: Session, summary: string, provider: Provider): Session {
  const injectionMessage = buildSummaryInjectionPrompt(summary);

  if (injectionMessage) {
    return addUserMessage(session, injectionMessage, provider);
  }

  return session;
}
