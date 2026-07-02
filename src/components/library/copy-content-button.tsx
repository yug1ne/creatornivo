"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface CopyContentButtonProps {
  content: string;
}

export function CopyContentButton({ content }: CopyContentButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant={copied ? "secondary" : "default"}
      size="sm"
      onClick={handleCopy}
    >
      {copied ? "✓ Copied" : "Copy"}
    </Button>
  );
}