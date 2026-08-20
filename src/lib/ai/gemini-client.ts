import { GoogleGenAI } from '@google/genai';
import {
  AiError,
  type AiClient,
  type StreamAnswerParams,
  type SuggestQuestionsParams,
} from './types';
import { buildSuggestedQuestionsPrompt } from './prompt';

/**
 * Model choice, explained: the Gemini 3.x family has iterated fast (several
 * preview models shipped and were deprecated within weeks of each other).
 * Gemini 3.5 Flash is now the GA, most-capable Flash model, so it's the
 * primary call; Gemini 2.5 Flash — older, but proven stable over a long GA
 * window — is the fallback if the primary is ever unavailable. (Gemini 3.6
 * Flash has since reached GA too, cheaper than 3.5 Flash, but it's only
 * been out a few weeks as of this writing — not worth taking on as the
 * fallback path yet given how quickly this family has churned; worth
 * revisiting once it's had more time in production elsewhere.) Swapping
 * either is a one-line change here — nothing else in the codebase
 * references model names directly.
 */
const PRIMARY_MODEL = 'gemini-3.5-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash';

type GeminiContent = { role: 'user' | 'model'; parts: [{ text: string }] };

export class GeminiClient implements AiClient {
  private readonly ai: GoogleGenAI;

  constructor(private readonly apiKey: string) {
    // The SDK throws lazily on first real call if the key is bad rather
    // than at construction time — the explicit empty-string check in
    // streamAnswer() below covers the "not set at all" case up front;
    // a key that's present but *invalid* still surfaces as an AiError
    // from the SDK call itself, same as before.
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Never throws — a suggestion failure (bad JSON, model error, empty
   * key) should never surface as a user-facing error or block a chat
   * session from being created. Returns [] on any failure; the caller
   * (SuggestionService) treats an empty array as "no chips to show",
   * nothing more dramatic than that.
   */
  async suggestQuestions(params: SuggestQuestionsParams): Promise<string[]> {
    if (this.apiKey.length === 0) return [];

    try {
      const response = await this.ai.models.generateContent({
        model: PRIMARY_MODEL,
        contents: [{ role: 'user', parts: [{ text: buildSuggestedQuestionsPrompt(params) }] }],
      });

      return parseSuggestedQuestions(response.text);
    } catch {
      return [];
    }
  }

  async *streamAnswer(params: StreamAnswerParams): AsyncGenerator<string> {
    if (this.apiKey.length === 0) {
      // Fails fast with an explicit message instead of letting both the
      // primary and fallback calls hit Google's servers and come back
      // with an opaque auth error each — a missing key is a
      // configuration problem, not something a model swap ever fixes.
      throw new AiError('GEMINI_API_KEY is not configured.');
    }

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

const MAX_SUGGESTED_QUESTIONS = 4;
const MAX_SUGGESTED_QUESTION_LENGTH = 200; // guards against a malformed/huge response, not a real question

/**
 * Gemini is instructed to return only a bare JSON array, but models don't
 * always follow formatting instructions exactly — this defensively
 * strips a markdown code fence if one shows up anyway, then validates the
 * parsed value really is an array of reasonably-sized strings before
 * trusting it, rather than assuming the prompt was obeyed.
 */
export function parseSuggestedQuestions(text: string | undefined): string[] {
  if (!text) return [];

  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, MAX_SUGGESTED_QUESTION_LENGTH))
    .slice(0, MAX_SUGGESTED_QUESTIONS);
}
