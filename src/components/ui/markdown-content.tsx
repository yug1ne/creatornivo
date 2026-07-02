"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { Components } from "react-markdown";

import { cn } from "@/lib/utils/cn";

interface MarkdownContentProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold tracking-tight text-foreground first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-7 text-xl font-semibold tracking-tight text-foreground first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-5 text-base font-semibold text-foreground first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="mb-4 leading-7 text-foreground/80 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc space-y-1.5 pl-6 text-foreground/80">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-foreground/80">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 rounded-r-[var(--radius-md)] border-l-4 border-primary/40 bg-accent/50 py-1 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:decoration-primary"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-8 border-border" />,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");

    if (isBlock) {
      return (
        <code className={cn("font-mono text-sm", className)} {...props}>
          {children}
        </code>
      );
    }

    return (
      <code
        className="rounded-[var(--radius-sm)] bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre
      className="mb-4 overflow-x-auto rounded-[var(--radius-lg)] border p-4 text-sm leading-relaxed"
      style={{
        backgroundColor: "var(--code-bg)",
        borderColor: "var(--code-border)",
      }}
    >
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-muted">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-foreground/80">{children}</td>
  ),
  input: ({ checked, ...props }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mr-2 accent-primary"
      {...props}
    />
  ),
};

export function MarkdownContent({
  content,
  isStreaming = false,
  className,
}: MarkdownContentProps) {
  return (
    <div className={cn("markdown-content text-sm", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-text-bottom"
          aria-hidden
        />
      )}
    </div>
  );
}