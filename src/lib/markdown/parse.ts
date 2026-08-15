/**
 * A deliberately small markdown-lite parser instead of pulling in
 * react-markdown/remark/unified — this app only ever renders Gemini's own
 * chat responses (bold, italics, inline code, fenced code blocks, links,
 * lists, headings), never arbitrary user-authored markdown documents, so
 * the full CommonMark surface area isn't needed. One dependency-free file
 * instead of ~6 new packages in the tree is also a smaller supply-chain
 * footprint for the same reason `cx.ts` skips `clsx` — see
 * docs/security-checklist.md's dependency-audit section for why that
 * matters here.
 *
 * Produces a plain AST (no HTML string, ever) so the React renderer can
 * build elements directly — nothing here is a `dangerouslySetInnerHTML`
 * candidate, which sidesteps a whole class of injection risk by
 * construction rather than by sanitizing after the fact.
 *
 * Known, accepted limitation: nested emphasis (e.g. `**bold *and italic*
 * text**`) isn't fully supported — the bold/italic token patterns are
 * intentionally non-overlapping regexes rather than a real recursive-
 * descent grammar. Gemini rarely nests emphasis in practice, and a
 * malformed nested case degrades to a partially-formatted (not broken or
 * unsafe) render.
 */

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; children: InlineNode[] };

export type BlockNode =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'heading'; level: number; children: InlineNode[] }
  | { type: 'codeBlock'; value: string; lang?: string }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] };

const INLINE_TOKEN = /`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\([^)\s]+\)/;

/** Parses a single line/run of text into inline formatting nodes. */
export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const match = INLINE_TOKEN.exec(remaining);
    if (!match || match.index === undefined) {
      nodes.push({ type: 'text', value: remaining });
      break;
    }

    const { index } = match;
    if (index > 0) {
      nodes.push({ type: 'text', value: remaining.slice(0, index) });
    }

    const token = match[0];
    nodes.push(parseToken(token));
    remaining = remaining.slice(index + token.length);
  }

  return nodes;
}

function parseToken(token: string): InlineNode {
  if (token.startsWith('`')) {
    return { type: 'code', value: token.slice(1, -1) };
  }
  if (token.startsWith('**') || token.startsWith('__')) {
    return { type: 'bold', children: parseInline(token.slice(2, -2)) };
  }
  if (token.startsWith('[')) {
    const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
    const label = linkMatch?.[1];
    const href = linkMatch?.[2];
    if (label !== undefined && href !== undefined) {
      return { type: 'link', href: sanitizeHref(href), children: [{ type: 'text', value: label }] };
    }
    return { type: 'text', value: token };
  }
  // Remaining case: single `*...*` or `_..._` — italics.
  return { type: 'italic', children: parseInline(token.slice(1, -1)) };
}

/**
 * Only `http:`/`https:` links are allowed through. Rejects `javascript:`
 * and other script-executing schemes (and anything malformed) rather than
 * rendering them — the one place this parser has to actively defend
 * against, since a link's href is otherwise passed straight to `<a>`.
 */
function sanitizeHref(href: string): string {
  try {
    const url = new URL(href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.toString();
    }
  } catch {
    // Relative/malformed URL — fall through to the safe default below.
  }
  return '#';
}

const FENCE_RE = /^```(\w*)\s*$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM_RE = /^\s*([-*]|\d+\.)\s+(.*)$/;

/** Parses a full markdown-lite document into a list of block nodes. */
export function parseBlocks(text: string): BlockNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    // `lines[i]` is guaranteed defined here (the `i < lines.length` guard
    // above holds under noUncheckedIndexedAccess too), but TS can't see
    // that through the loop — the `?? ''` is unreachable in practice, not
    // a real fallback.
    const line = lines[i] ?? '';

    if (line.trim().length === 0) {
      i++;
      continue;
    }

    const fenceMatch = FENCE_RE.exec(line.trim());
    if (fenceMatch) {
      const lang = fenceMatch[1] || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && (lines[i] ?? '').trim() !== '```') {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // Skip the closing fence, if present; tolerate an unterminated one at EOF.
      blocks.push({ type: 'codeBlock', value: codeLines.join('\n'), lang });
      continue;
    }

    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1;
      const headingText = headingMatch[2] ?? '';
      blocks.push({ type: 'heading', level, children: parseInline(headingText) });
      i++;
      continue;
    }

    const listItemMatch = LIST_ITEM_RE.exec(line);
    if (listItemMatch) {
      const ordered = /^\d+\.$/.test(listItemMatch[1] ?? '');
      const items: InlineNode[][] = [];
      while (i < lines.length) {
        const m = LIST_ITEM_RE.exec(lines[i] ?? '');
        if (!m) break;
        items.push(parseInline(m[2] ?? ''));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length) {
      const candidate = lines[i] ?? '';
      if (
        candidate.trim().length === 0 ||
        FENCE_RE.test(candidate.trim()) ||
        HEADING_RE.test(candidate) ||
        LIST_ITEM_RE.test(candidate)
      ) {
        break;
      }
      paraLines.push(candidate);
      i++;
    }
    blocks.push({ type: 'paragraph', children: parseInline(paraLines.join(' ')) });
  }

  return blocks;
}
