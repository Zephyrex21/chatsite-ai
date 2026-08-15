import { describe, it, expect } from 'vitest';
import { parseInline, parseBlocks } from '@/lib/markdown/parse';

describe('parseInline', () => {
  it('parses plain text with no formatting as a single text node', () => {
    expect(parseInline('just some text')).toEqual([{ type: 'text', value: 'just some text' }]);
  });

  it('parses bold with ** and __', () => {
    expect(parseInline('**bold**')).toEqual([
      { type: 'bold', children: [{ type: 'text', value: 'bold' }] },
    ]);
    expect(parseInline('__also bold__')).toEqual([
      { type: 'bold', children: [{ type: 'text', value: 'also bold' }] },
    ]);
  });

  it('parses italic with * and _', () => {
    expect(parseInline('*italic*')).toEqual([
      { type: 'italic', children: [{ type: 'text', value: 'italic' }] },
    ]);
    expect(parseInline('_also italic_')).toEqual([
      { type: 'italic', children: [{ type: 'text', value: 'also italic' }] },
    ]);
  });

  it('parses inline code, without interpreting formatting characters inside it', () => {
    expect(parseInline('`const x = 1 * 2`')).toEqual([{ type: 'code', value: 'const x = 1 * 2' }]);
  });

  it('parses a link and preserves an allowed https href', () => {
    expect(parseInline('[docs](https://example.com/path)')).toEqual([
      {
        type: 'link',
        href: 'https://example.com/path',
        children: [{ type: 'text', value: 'docs' }],
      },
    ]);
  });

  it('rejects a javascript: link href, replacing it with a safe placeholder', () => {
    // The link-token regex itself stops at the first unescaped `)`, so a
    // trailing `)` from `alert(1)` lands outside the token as plain text
    // — harmless either way, since what matters is that the link's href
    // never becomes the raw `javascript:` string.
    const result = parseInline('[click me](javascript:alert(1))');
    expect(result).toEqual([
      { type: 'link', href: '#', children: [{ type: 'text', value: 'click me' }] },
      { type: 'text', value: ')' },
    ]);
  });

  it('rejects a malformed link href', () => {
    const result = parseInline('[bad](not a url)');
    // Regex requires no whitespace inside the URL portion, so this
    // doesn't even match as a link token — falls back to plain text.
    expect(result).toEqual([{ type: 'text', value: '[bad](not a url)' }]);
  });

  it('handles text surrounding a formatted span', () => {
    expect(parseInline('before **bold** after')).toEqual([
      { type: 'text', value: 'before ' },
      { type: 'bold', children: [{ type: 'text', value: 'bold' }] },
      { type: 'text', value: ' after' },
    ]);
  });

  it('handles multiple formatted spans in one line', () => {
    expect(parseInline('**bold** and `code` and *italic*')).toEqual([
      { type: 'bold', children: [{ type: 'text', value: 'bold' }] },
      { type: 'text', value: ' and ' },
      { type: 'code', value: 'code' },
      { type: 'text', value: ' and ' },
      { type: 'italic', children: [{ type: 'text', value: 'italic' }] },
    ]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseInline('')).toEqual([]);
  });
});

describe('parseBlocks', () => {
  it('parses a single line as one paragraph', () => {
    expect(parseBlocks('Hello world')).toEqual([
      { type: 'paragraph', children: [{ type: 'text', value: 'Hello world' }] },
    ]);
  });

  it('joins consecutive non-blank lines into one paragraph', () => {
    const blocks = parseBlocks('line one\nline two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'paragraph' });
  });

  it('splits on a blank line into separate paragraphs', () => {
    const blocks = parseBlocks('first paragraph\n\nsecond paragraph');
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ type: 'paragraph' });
    expect(blocks[1]).toMatchObject({ type: 'paragraph' });
  });

  it('parses a heading and its level from the number of #s', () => {
    expect(parseBlocks('## Section title')).toEqual([
      { type: 'heading', level: 2, children: [{ type: 'text', value: 'Section title' }] },
    ]);
  });

  it('parses a fenced code block, preserving its content verbatim', () => {
    const input = '```js\nconst x = 1;\nconsole.log(x);\n```';
    expect(parseBlocks(input)).toEqual([
      { type: 'codeBlock', value: 'const x = 1;\nconsole.log(x);', lang: 'js' },
    ]);
  });

  it('parses a fenced code block with no language tag', () => {
    const input = '```\nplain\n```';
    expect(parseBlocks(input)).toEqual([{ type: 'codeBlock', value: 'plain', lang: undefined }]);
  });

  it('does not treat markdown syntax inside a code block as formatting', () => {
    const input = '```\n**not bold** _not italic_\n```';
    const blocks = parseBlocks(input);
    expect(blocks).toEqual([
      { type: 'codeBlock', value: '**not bold** _not italic_', lang: undefined },
    ]);
  });

  it('parses an unordered list', () => {
    const blocks = parseBlocks('- first\n- second\n- third');
    expect(blocks).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          [{ type: 'text', value: 'first' }],
          [{ type: 'text', value: 'second' }],
          [{ type: 'text', value: 'third' }],
        ],
      },
    ]);
  });

  it('parses an ordered list', () => {
    const blocks = parseBlocks('1. first\n2. second');
    expect(blocks).toEqual([
      {
        type: 'list',
        ordered: true,
        items: [[{ type: 'text', value: 'first' }], [{ type: 'text', value: 'second' }]],
      },
    ]);
  });

  it('parses a list item with inline formatting', () => {
    const blocks = parseBlocks('- **important** point');
    expect(blocks).toEqual([
      {
        type: 'list',
        ordered: false,
        items: [
          [
            { type: 'bold', children: [{ type: 'text', value: 'important' }] },
            { type: 'text', value: ' point' },
          ],
        ],
      },
    ]);
  });

  it('handles a mix of paragraphs, a heading, a list, and a code block in one document', () => {
    const input = [
      'Here is a summary:',
      '',
      '## Key points',
      '',
      '- point one',
      '- point two',
      '',
      '```',
      'example()',
      '```',
    ].join('\n');

    const blocks = parseBlocks(input);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'heading', 'list', 'codeBlock']);
  });

  it('returns an empty array for an empty or whitespace-only document', () => {
    expect(parseBlocks('')).toEqual([]);
    expect(parseBlocks('   \n\n  ')).toEqual([]);
  });
});
