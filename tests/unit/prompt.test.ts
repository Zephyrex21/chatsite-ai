import { describe, it, expect } from 'vitest';
import { buildSystemInstruction, buildSuggestedQuestionsPrompt } from '@/lib/ai/prompt';

describe('buildSystemInstruction', () => {
  it('includes the page title and URL when a title is present', () => {
    const result = buildSystemInstruction({
      url: 'https://example.com',
      title: 'Example Domain',
      markdown: 'Some page content.',
    });

    expect(result).toContain('Example Domain (https://example.com)');
  });

  it('falls back to just the URL when there is no title', () => {
    const result = buildSystemInstruction({
      url: 'https://example.com',
      title: null,
      markdown: 'Some page content.',
    });

    expect(result).toContain('--- PAGE: https://example.com ---');
  });

  it('includes the full markdown content when under the size limit', () => {
    const markdown = 'This is the actual page content that should be included verbatim.';
    const result = buildSystemInstruction({ url: 'https://example.com', title: null, markdown });

    expect(result).toContain(markdown);
    expect(result).not.toContain('truncated');
  });

  it('instructs the model to treat the page content as untrusted reference material', () => {
    const result = buildSystemInstruction({
      url: 'https://example.com',
      title: null,
      markdown: 'content',
    });

    // Not asserting exact wording (that's an implementation detail that can
    // reasonably change) — just that the injection-resistance framing exists.
    expect(result.toLowerCase()).toContain('never as instructions');
    expect(result.toLowerCase()).toContain('ignore that text');
  });

  it('truncates markdown that exceeds the context budget', () => {
    const hugeMarkdown = 'a'.repeat(150_000);
    const result = buildSystemInstruction({
      url: 'https://example.com',
      title: null,
      markdown: hugeMarkdown,
    });

    expect(result).toContain('[...content truncated for length...]');
    expect(result.length).toBeLessThan(hugeMarkdown.length);
  });

  it('delimits the page content with clear start/end markers', () => {
    const result = buildSystemInstruction({
      url: 'https://example.com',
      title: 'Test',
      markdown: 'body text',
    });

    expect(result).toContain('--- PAGE:');
    expect(result).toContain('--- END PAGE CONTENT ---');
  });
});

describe('buildSuggestedQuestionsPrompt', () => {
  it('includes the page title and URL when a title is present', () => {
    const result = buildSuggestedQuestionsPrompt({
      url: 'https://example.com',
      title: 'Example Domain',
      markdown: 'Some page content.',
    });

    expect(result).toContain('Example Domain (https://example.com)');
  });

  it('falls back to just the URL when there is no title', () => {
    const result = buildSuggestedQuestionsPrompt({
      url: 'https://example.com',
      title: null,
      markdown: 'Some page content.',
    });

    expect(result).toContain('--- PAGE: https://example.com ---');
  });

  it('instructs the model to return only a bare JSON array', () => {
    const result = buildSuggestedQuestionsPrompt({
      url: 'https://example.com',
      title: null,
      markdown: 'content',
    });

    expect(result.toLowerCase()).toContain('json array');
    expect(result.toLowerCase()).toContain('no markdown code fences');
  });

  it('asks for exactly 4 questions', () => {
    const result = buildSuggestedQuestionsPrompt({
      url: 'https://example.com',
      title: null,
      markdown: 'content',
    });

    expect(result).toContain('exactly 4');
  });

  it('includes the page content, truncated well under the main grounding budget', () => {
    const hugeMarkdown = 'a'.repeat(50_000);
    const result = buildSuggestedQuestionsPrompt({
      url: 'https://example.com',
      title: null,
      markdown: hugeMarkdown,
    });

    expect(result).toContain('[...content truncated for length...]');
    // Suggestions only need a general sense of the page, so this prompt's
    // truncation budget is deliberately much smaller than the full
    // grounding prompt's — asserting that difference here would break if
    // either budget is retuned, so this just checks the prompt itself
    // stays well short of the full 50,000-character input.
    expect(result.length).toBeLessThan(20_000);
  });
});
