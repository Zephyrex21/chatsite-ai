import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { parseBlocks, type BlockNode, type InlineNode } from '@/lib/markdown/parse';

export interface MarkdownProps {
  content: string;
}

/**
 * Renders `content` (assumed to be an assistant chat message) through the
 * markdown-lite parser in `@/lib/markdown/parse`. The parser only ever
 * produces a plain AST, never an HTML string, so this component builds
 * React elements directly — there's no `dangerouslySetInnerHTML` anywhere
 * in this file, by construction rather than by sanitizing untrusted HTML
 * after the fact.
 */
export function Markdown({ content }: MarkdownProps) {
  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <Block key={index} block={block} blockKey={`b${index}`} />
      ))}
    </div>
  );
}

function Block({ block, blockKey }: { block: BlockNode; blockKey: string }) {
  switch (block.type) {
    case 'paragraph':
      return <p>{renderInline(block.children, blockKey)}</p>;

    case 'heading': {
      // Rendered as bold text at a heading-ish size rather than a real
      // <h1>-<h6> — nesting genuine headings inside a chat bubble would
      // insert arbitrary levels into the page's actual document outline,
      // which is a real accessibility concern for screen-reader
      // navigation. Visual weight without structural impact is the
      // better trade-off for AI-generated content at this scale.
      const sizeByLevel = [
        'text-lg',
        'text-lg',
        'text-base',
        'text-base',
        'text-[15px]',
        'text-[15px]',
      ];
      return (
        <p className={cx('font-semibold', sizeByLevel[block.level - 1] ?? 'text-[15px]')}>
          {renderInline(block.children, blockKey)}
        </p>
      );
    }

    case 'codeBlock':
      return (
        <pre className="overflow-x-auto rounded-(--clay-radius-sm) bg-black/10 p-3 font-mono text-[0.85em] dark:bg-white/10">
          <code>{block.value}</code>
        </pre>
      );

    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className={cx('space-y-1 pl-5', block.ordered ? 'list-decimal' : 'list-disc')}>
          {block.items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item, `${blockKey}-i${itemIndex}`)}</li>
          ))}
        </ListTag>
      );
    }
  }
}

function renderInline(nodes: InlineNode[], keyPrefix: string): ReactNode {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (node.type) {
      case 'text':
        return node.value.length > 0 ? <span key={key}>{node.value}</span> : null;
      case 'bold':
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case 'italic':
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case 'code':
        return (
          <code
            key={key}
            className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
          >
            {node.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={key}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {renderInline(node.children, key)}
          </a>
        );
    }
  });
}
