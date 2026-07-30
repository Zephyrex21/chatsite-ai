export type ChatErrorCode = 'SESSION_NOT_FOUND' | 'AI_ERROR';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  readonly cause?: unknown;

  constructor(code: ChatErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.cause = cause;
  }
}
