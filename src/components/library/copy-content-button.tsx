"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getGeneratedOutputValidationMessage,
  validateGeneratedOutput,
} from "@/lib/templates/output-validation";

interface CopyContentButtonProps {
  content: string;
}

export function CopyContentButton({ content }: CopyContentButtonProps) {
  const [copied, setCopied] = useState(false);
  const validationMessage = getGeneratedOutputValidationMessage(
    validateGeneratedOutput(content),
  );

  async function handleCopy() {
    if (validationMessage) return;
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
      disabled={Boolean(validationMessage)}
      title={validationMessage ?? undefined}
    >
      {copied ? "✓ Copied" : "Copy"}
    </Button>
  );
}
