export type GeminiMessageRole = 'user' | 'model';

export interface GeminiPart {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {id?: string; name: string; args: Record<string, unknown>;};
  functionResponse?: {id?: string; name: string; response: Record<string, unknown>;};
}

export interface GeminiMessage {
  role: GeminiMessageRole;
  parts: GeminiPart[];
}
