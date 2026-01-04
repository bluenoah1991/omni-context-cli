import summaryInjectionTemplate from './summary-injection.txt';
import summaryTemplate from './summary.txt';

export const SUMMARY_UI_PLACEHOLDER = '[Previous conversation summarized]';

export function buildSummaryPrompt(conversationHistory: string): string {
  return summaryTemplate.replace('{{CONVERSATION_HISTORY}}', conversationHistory);
}

export function buildSummaryInjectionPrompt(summary: string): string {
  if (!summary) {
    return '';
  }

  const injectionContent = summaryInjectionTemplate.replace('{{SUMMARY}}', summary);
  return `<dual_message>\n<ui>${SUMMARY_UI_PLACEHOLDER}</ui>\n<prompt>\n${injectionContent}\n</prompt>\n</dual_message>`;
}
