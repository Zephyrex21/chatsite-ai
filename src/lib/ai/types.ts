/**
 * Shared types for the AI layer. Kept framework-agnostic so ChatService can
 * be unit-tested against a fake AiClient instead of a real Gemini call.
 */

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export class AiError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AiError';
    this.cause = cause;
  }
}

export interface StreamAnswerParams {
  systemInstruction: string;
  history: ChatTurn[];
  question: string;
}

/**
 * Anything that can turn (system instruction + history + question) into a
 * streamed answer. Gemini is the only implementation today; the interface
 * exists so ChatService never imports the Gemini SDK directly.
 */
export interface AiClient {
  streamAnswer(params: StreamAnswerParams): AsyncGenerator<string>;
}
