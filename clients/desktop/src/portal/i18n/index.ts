import { enUS, type Locale } from './en-US';
import { zhCN } from './zh-CN';

const locales: Record<string, Locale> = {'en-US': enUS, 'zh-CN': zhCN};

export const SUPPORTED_LANGUAGES: Array<{value: string; label: string;}> = [{
  value: 'en-US',
  label: 'English',
}, {value: 'zh-CN', label: '简体中文'}];

export function getLocale(lang?: string): Locale {
  return locales[lang ?? 'en-US'] ?? enUS;
}

export type { Locale };
