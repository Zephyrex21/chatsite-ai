import { GoogleGenAI } from '@google/genai';
import { AiError, type AiClient, type StreamAnswerParams } from './types';

/**
 * Model choice, explained: the Gemini 3.x family has iterated fast (several
 * preview models shipped and were deprecated within weeks of each other).
 * Gemini 2.5 Flash is the proven, stable choice for the primary call, with
 * Gemini 3.5 Flash (GA, stronger) as a fallback on failure. Swapping either
 * is a one-line change here — nothing else in the codebase references model
 * names directly.
 */
const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-3.5-flash';

type GeminiContent = { role: 'user' | 'model'; parts: [{ text: string }] };

export class GeminiClient implements AiClient {
  private readonly ai: GoogleGenAI;

  constructor(apiKey: string) {
    // The SDK throws lazily on first real call if the key is bad/missing
    // rather than at construction time, so we don't need our own guard here
    // — a missing key surfaces as an AiError from streamAnswer() below.
    this.ai = new GoogleGenAI({ apiKey });
  }

  async *streamAnswer(params: StreamAnswerParams): AsyncGenerator<string> {
    const contents = buildContents(params);

    let stream: AsyncGenerator<{ text?: string }>;
    try {
      stream = await this.ai.models.generateContentStream({
        model: PRIMARY_MODEL,
        contents,
        config: { systemInstruction: params.systemInstruction },
      });
    } catch (primaryErr) {
      try {
        stream = await this.ai.models.generateContentStream({
          model: FALLBACK_MODEL,
          contents,
          config: { systemInstruction: params.systemInstruction },
        });
      } catch (fallbackErr) {
        throw new AiError(
          `Both Gemini models (${PRIMARY_MODEL}, ${FALLBACK_MODEL}) failed to start a response.`,
          fallbackErr ?? primaryErr,
        );
      }
    }

    try {
      for await (const chunk of stream) {
        if (chunk.text) yield chunk.text;
      }
    } catch (streamErr) {
      // Once streaming has begun and content may already be visible to the
      // user, we deliberately do NOT silently retry with the fallback model
      // — that risks duplicating or contradicting content already shown.
      // The caller decides how to end the response gracefully instead.
      throw new AiError('The Gemini response was interrupted mid-stream.', streamErr);
    }
  }
}

function buildContents(params: StreamAnswerParams): GeminiContent[] {
  const history: GeminiContent[] = params.history.map((turn) => ({
    role: turn.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: turn.content }],
  }));

  return [...history, { role: 'user', parts: [{ text: params.question }] }];
}
