"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  getGeneratedOutputValidationMessage,
  sanitizeGeneratedOutput,
  validateGeneratedOutput,
} from "@/lib/templates/output-validation";

interface CopyContentButtonProps {
  content: string;
}

export function CopyContentButton({ content }: CopyContentButtonProps) {
  const [copied, setCopied] = useState(false);
  const sanitizedOutput = sanitizeGeneratedOutput(content);
  const validationMessage = getGeneratedOutputValidationMessage(
    validateGeneratedOutput(sanitizedOutput.content),
  );

  async function handleCopy() {
    if (validationMessage) return;
    await navigator.clipboard.writeText(sanitizedOutput.content);
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
