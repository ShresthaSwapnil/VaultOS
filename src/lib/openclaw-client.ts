import { config } from './config';

export interface OpenClawMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionPayload {
  messages: OpenClawMessage[];
  stream?: boolean;
}

export const openClawClient = {
  // Simple ping check to verify if OpenClaw is active
  async isOnline(): Promise<boolean> {
    try {
      const headers: HeadersInit = {};
      if (config.openClawToken) {
        headers['Authorization'] = `Bearer ${config.openClawToken}`;
      }
      const res = await fetch(`${config.openClawUrl}/v1/models`, {
        method: 'GET',
        headers,
        // Short timeout to avoid blocking startup checks
        signal: AbortSignal.timeout(2000),
      });
      return res.status === 200;
    } catch (e) {
      return false;
    }
  },

  // Stream completions directly from OpenClaw's OpenAI-compatible endpoint
  async streamCompletion(payload: ChatCompletionPayload): Promise<Response> {
    const url = `${config.openClawUrl}/v1/chat/completions`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (config.openClawToken) {
      headers['Authorization'] = `Bearer ${config.openClawToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'openclaw/default', // OpenClaw default agent target
        messages: payload.messages,
        stream: payload.stream ?? true,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenClaw API error: status ${response.status}`);
    }

    return response;
  },
};
