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
  /**
   * Generous enough for any real question, but blocks someone from
   * pasting megabytes of text into the question field — that would
   * otherwise pass straight through to the Gemini call with no limit,
   * inflating cost and risking hitting the model's context ceiling
   * alongside the page content already in the prompt.
   */
  private static readonly MAX_QUESTION_LENGTH = 4000;

  constructor(
    private readonly aiClient: AiClient,
    private readonly sessionRepository: ChatSessionRepository,
  ) {}

  async createSession(siteId: string, userId?: string | null): Promise<ChatSessionWithHistory> {
    return this.sessionRepository.create(siteId, userId);
  }

  async getSession(
    sessionId: string,
    requestingUserId?: string | null,
  ): Promise<ChatSessionWithHistory> {
    const session = await this.sessionRepository.findWithHistory(sessionId);
    if (!session) {
      throw new ChatError('SESSION_NOT_FOUND', `No chat session found for id "${sessionId}".`);
    }
    this.assertOwnership(session, requestingUserId);
    return session;
  }

  async listSessionsForUser(userId: string): Promise<ChatSessionWithHistory[]> {
    return this.sessionRepository.findByUser(userId);
  }

  async enableSharing(sessionId: string, requestingUserId?: string | null): Promise<string> {
    // Confirms the session actually exists (and is owned by this
    // requester, if it has an owner) first, so callers get a clean
    // SESSION_NOT_FOUND instead of a confusing downstream Prisma error.
    await this.getSession(sessionId, requestingUserId);
    return this.sessionRepository.enableSharing(sessionId);
  }

  /**
   * A session created while signed in belongs to that user. Anyone else —
   * including a *different* signed-in user who merely learned the session
   * id — gets the same SESSION_NOT_FOUND a genuinely missing session would
   * produce, rather than a 403 that would confirm the session exists.
   *
   * Guest sessions (no userId) have no owner to check against, so they
   * stay reachable by anyone who knows the id. That's an intentional,
   * documented trade-off (see docs/security-checklist.md) — guest mode has
   * no identity to check ownership against in the first place — not an
   * oversight left over from tightening this for signed-in users.
   */
  private assertOwnership(session: ChatSessionWithHistory, requestingUserId?: string | null): void {
    if (session.userId && session.userId !== requestingUserId) {
      throw new ChatError('SESSION_NOT_FOUND', `No chat session found for id "${session.id}".`);
    }
  }

  async getSharedSession(slug: string): Promise<ChatSessionWithHistory> {
    const session = await this.sessionRepository.findByShareSlug(slug);
    if (!session) {
      throw new ChatError('SESSION_NOT_FOUND', `No shared conversation found for this link.`);
    }
    return session;
  }

  async *ask(
    sessionId: string,
    question: string,
    requestingUserId?: string | null,
  ): AsyncGenerator<string> {
    if (question.length > ChatService.MAX_QUESTION_LENGTH) {
      throw new ChatError(
        'INVALID_INPUT',
        `Question is too long (max ${ChatService.MAX_QUESTION_LENGTH} characters).`,
      );
    }

    const session = await this.sessionRepository.findWithHistory(sessionId);
    if (!session) {
      throw new ChatError('SESSION_NOT_FOUND', `No chat session found for id "${sessionId}".`);
    }
    this.assertOwnership(session, requestingUserId);

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
