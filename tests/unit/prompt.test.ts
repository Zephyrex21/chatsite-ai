import { describe, it, expect } from 'vitest';
import { buildSystemInstruction } from '@/lib/ai/prompt';

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
