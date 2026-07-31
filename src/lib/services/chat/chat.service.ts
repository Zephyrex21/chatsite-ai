import { buildSystemInstruction } from '@/lib/ai/prompt';
import { AiError, type AiClient, type ChatTurn } from '@/lib/ai/types';
import type {
  ChatSessionRepository,
  ChatSessionWithHistory,
} from '@/lib/repositories/chat-session.repository';
import { ChatError } from './types';

/**
 * Orchestrates a single chat turn: load the session (site content + prior
 * messages) -> build a grounded prompt -> stream the answer -> persist both
 * the user's question and the assistant's full answer.
 *
 * Framework-agnostic by construction: takes an AiClient and a
 * ChatSessionRepository as constructor params rather than importing the
 * Gemini SDK or Prisma directly, so it's fully unit-testable with fakes.
 */
export class ChatService {
  constructor(
    private readonly aiClient: AiClient,
    private readonly sessionRepository: ChatSessionRepository,
  ) {}

  async createSession(siteId: string, userId?: string | null): Promise<ChatSessionWithHistory> {
    return this.sessionRepository.create(siteId, userId);
  }

  async getSession(sessionId: string): Promise<ChatSessionWithHistory> {
    const session = await this.sessionRepository.findWithHistory(sessionId);
    if (!session) {
      throw new ChatError('SESSION_NOT_FOUND', `No chat session found for id "${sessionId}".`);
    }
    return session;
  }

  async listSessionsForUser(userId: string): Promise<ChatSessionWithHistory[]> {
    return this.sessionRepository.findByUser(userId);
  }

  async *ask(sessionId: string, question: string): AsyncGenerator<string> {
    const session = await this.sessionRepository.findWithHistory(sessionId);
    if (!session) {
      throw new ChatError('SESSION_NOT_FOUND', `No chat session found for id "${sessionId}".`);
    }

    const systemInstruction = buildSystemInstruction(session.site);
    const history: ChatTurn[] = session.messages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content,
    }));

    // Persist the question before calling the model, so it's not lost if
    // the AI call fails — the user's side of the conversation is always
    // recorded regardless of what happens next.
    await this.sessionRepository.addMessage(sessionId, 'user', question);

    let fullAnswer = '';
    try {
      for await (const chunk of this.aiClient.streamAnswer({
        systemInstruction,
        history,
        question,
      })) {
        fullAnswer += chunk;
        yield chunk;
      }
    } catch (err) {
      throw err instanceof AiError
        ? new ChatError('AI_ERROR', err.message, err)
        : new ChatError('AI_ERROR', 'The AI response failed unexpectedly.', err);
    } finally {
      // Persist whatever was generated even on a partial/interrupted
      // stream, so a cut-off answer isn't silently lost from history.
      if (fullAnswer.trim().length > 0) {
        await this.sessionRepository.addMessage(sessionId, 'assistant', fullAnswer);
      }
    }
  }
}
