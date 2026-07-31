import { describe, it, expect } from 'vitest';
import { ChatService } from '@/lib/services/chat/chat.service';
import { ChatError } from '@/lib/services/chat/types';
import { AiError, type AiClient, type StreamAnswerParams } from '@/lib/ai/types';
import type {
  ChatSessionRepository,
  ChatSessionWithHistory,
} from '@/lib/repositories/chat-session.repository';

class FakeAiClient implements AiClient {
  public receivedParams: StreamAnswerParams[] = [];

  constructor(private readonly chunks: string[] | (() => AsyncGenerator<string>)) {}

  async *streamAnswer(params: StreamAnswerParams): AsyncGenerator<string> {
    this.receivedParams.push(params);
    if (typeof this.chunks === 'function') {
      yield* this.chunks();
      return;
    }
    for (const chunk of this.chunks) {
      yield chunk;
    }
  }
}

type FakeSession = ChatSessionWithHistory;

class FakeChatSessionRepository implements ChatSessionRepository {
  private sessions = new Map<string, FakeSession>();
  public addedMessages: Array<{ sessionId: string; role: string; content: string }> = [];
  private nextId = 1;

  async create(siteId: string, userId?: string | null): Promise<FakeSession> {
    const id = `session-${this.nextId++}`;
    const session = {
      id,
      siteId,
      userId: userId ?? null,
      isShared: false,
      shareSlug: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      site: {
        id: siteId,
        url: 'https://example.com',
        title: 'Example Domain',
        markdown: 'Example page content.',
        wordCount: 3,
        scrapedAt: new Date(),
        expiresAt: null,
      },
      messages: [],
    } as unknown as FakeSession;
    this.sessions.set(id, session);
    return session;
  }

  async findWithHistory(sessionId: string): Promise<FakeSession | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async findByUser(userId: string): Promise<FakeSession[]> {
    return Array.from(this.sessions.values()).filter(
      (session) => (session as unknown as { userId: string | null }).userId === userId,
    );
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    this.addedMessages.push({ sessionId, role, content });
    const session = this.sessions.get(sessionId);
    if (session) {
      (session.messages as unknown[]).push({
        id: `msg-${this.addedMessages.length}`,
        sessionId,
        role,
        content,
        createdAt: new Date(),
      });
    }
  }
}

async function collect(gen: AsyncGenerator<string>): Promise<string> {
  let out = '';
  for await (const chunk of gen) out += chunk;
  return out;
}

describe('ChatService', () => {
  it('throws SESSION_NOT_FOUND for an unknown session id, without calling the AI client', async () => {
    const ai = new FakeAiClient(['hello']);
    const repo = new FakeChatSessionRepository();
    const service = new ChatService(ai, repo);

    await expect(service.ask('does-not-exist', 'q1').next()).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
    await expect(service.ask('does-not-exist', 'q2').next()).rejects.toBeInstanceOf(ChatError);
    expect(ai.receivedParams).toHaveLength(0);
  });

  it('streams the answer and persists both the question and the full answer', async () => {
    const ai = new FakeAiClient(['Hel', 'lo', ' there!']);
    const repo = new FakeChatSessionRepository();
    const session = await repo.create('site-1');
    const service = new ChatService(ai, repo);

    const answer = await collect(service.ask(session.id, 'What is this page about?'));

    expect(answer).toBe('Hello there!');
    expect(repo.addedMessages).toEqual([
      { sessionId: session.id, role: 'user', content: 'What is this page about?' },
      { sessionId: session.id, role: 'assistant', content: 'Hello there!' },
    ]);
  });

  it('grounds the AI call using the system instruction built from the site content', async () => {
    const ai = new FakeAiClient(['ok']);
    const repo = new FakeChatSessionRepository();
    const session = await repo.create('site-1');
    const service = new ChatService(ai, repo);

    await collect(service.ask(session.id, 'Summarize this'));

    expect(ai.receivedParams).toHaveLength(1);
    expect(ai.receivedParams[0]?.systemInstruction).toContain('Example Domain');
    expect(ai.receivedParams[0]?.question).toBe('Summarize this');
  });

  it('passes prior conversation turns as history on a second question', async () => {
    const ai = new FakeAiClient(['second answer']);
    const repo = new FakeChatSessionRepository();
    const session = await repo.create('site-1');
    await repo.addMessage(session.id, 'user', 'first question');
    await repo.addMessage(session.id, 'assistant', 'first answer');

    const service = new ChatService(ai, repo);
    await collect(service.ask(session.id, 'second question'));

    expect(ai.receivedParams[0]?.history).toEqual([
      { role: 'user', content: 'first question' },
      { role: 'assistant', content: 'first answer' },
    ]);
  });

  it('wraps an AiError as a ChatError with code AI_ERROR', async () => {
    const ai = new FakeAiClient(async function* () {
      throw new AiError('model unavailable');
    });
    const repo = new FakeChatSessionRepository();
    const session = await repo.create('site-1');
    const service = new ChatService(ai, repo);

    await expect(collect(service.ask(session.id, 'question'))).rejects.toMatchObject({
      code: 'AI_ERROR',
      message: 'model unavailable',
    });
  });

  it('still persists a partial answer if the stream is interrupted mid-way', async () => {
    const ai = new FakeAiClient(async function* () {
      yield 'partial ';
      yield 'answer';
      throw new AiError('connection dropped');
    });
    const repo = new FakeChatSessionRepository();
    const session = await repo.create('site-1');
    const service = new ChatService(ai, repo);

    await expect(collect(service.ask(session.id, 'question'))).rejects.toBeTruthy();

    const assistantMessage = repo.addedMessages.find((m) => m.role === 'assistant');
    expect(assistantMessage?.content).toBe('partial answer');
  });

  it('always records the user question even if the AI call fails immediately', async () => {
    const ai = new FakeAiClient(async function* () {
      throw new AiError('down');
    });
    const repo = new FakeChatSessionRepository();
    const session = await repo.create('site-1');
    const service = new ChatService(ai, repo);

    await expect(collect(service.ask(session.id, 'will this be saved?'))).rejects.toBeTruthy();

    expect(repo.addedMessages).toContainEqual({
      sessionId: session.id,
      role: 'user',
      content: 'will this be saved?',
    });
  });

  it('links a new session to a user when signed in', async () => {
    const ai = new FakeAiClient(['ok']);
    const repo = new FakeChatSessionRepository();
    const service = new ChatService(ai, repo);

    const session = await service.createSession('site-1', 'user-42');

    expect((session as unknown as { userId: string | null }).userId).toBe('user-42');
  });

  it('creates a guest (unlinked) session when no user id is given', async () => {
    const ai = new FakeAiClient(['ok']);
    const repo = new FakeChatSessionRepository();
    const service = new ChatService(ai, repo);

    const session = await service.createSession('site-1');

    expect((session as unknown as { userId: string | null }).userId).toBeNull();
  });

  it("lists only a specific user's sessions", async () => {
    const ai = new FakeAiClient(['ok']);
    const repo = new FakeChatSessionRepository();
    const service = new ChatService(ai, repo);

    await service.createSession('site-1', 'user-a');
    await service.createSession('site-2', 'user-b');
    await service.createSession('site-3', 'user-a');
    await service.createSession('site-4'); // guest session, should never appear

    const sessions = await service.listSessionsForUser('user-a');

    expect(sessions).toHaveLength(2);
    expect(sessions.map((s) => s.siteId)).toEqual(['site-1', 'site-3']);
  });

  it('fetches a single session by id, including any prior messages', async () => {
    const ai = new FakeAiClient(['ok']);
    const repo = new FakeChatSessionRepository();
    const service = new ChatService(ai, repo);
    const created = await service.createSession('site-1');
    await repo.addMessage(created.id, 'user', 'hi');

    const fetched = await service.getSession(created.id);

    expect(fetched.id).toBe(created.id);
    expect(fetched.messages).toHaveLength(1);
  });

  it('throws SESSION_NOT_FOUND from getSession for an unknown id', async () => {
    const ai = new FakeAiClient(['ok']);
    const repo = new FakeChatSessionRepository();
    const service = new ChatService(ai, repo);

    await expect(service.getSession('nope')).rejects.toMatchObject({
      code: 'SESSION_NOT_FOUND',
    });
  });
});
