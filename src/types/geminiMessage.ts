export type GeminiMessageRole = 'user' | 'model';

export interface GeminiFunctionResponsePart {
  inlineData?: {mimeType: string; data: string;};
}

export interface GeminiPart {
  text?: string;
  inlineData?: {mimeType: string; data: string; fileName?: string;};
  thought?: boolean;
  thoughtSignature?: string;
  functionCall?: {id?: string; name: string; args: Record<string, unknown>;};
  functionResponse?: {
    id?: string;
    name: string;
    response: Record<string, unknown>;
    parts?: GeminiFunctionResponsePart[];
  };
}

export interface GeminiMessage {
  role: GeminiMessageRole;
  parts: GeminiPart[];
}
