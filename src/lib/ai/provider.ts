import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import type { Plan } from "@/config/plans";
import { getPlanLimits } from "@/config/plans";

export interface StreamContentInput {
  prompt: string;
  plan: Plan;
  model?: string;
  onFinish?: (result: {
    text: string;
    model: string;
    tokensUsed: number;
  }) => Promise<void>;
}

export const MODEL_BY_PLAN: Record<Plan, string> = {
  free: "gpt-4o-mini",
  pro: "gpt-4o",
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function buildFallbackContent(prompt: string): string {
  const preview = prompt.length > 200 ? `${prompt.slice(0, 200)}...` : prompt;

  return `# Generated content

Based on your prompt, Creatornivo prepared the following draft:

---

${preview}

---

## Recommendations

- Verify facts and adapt the tone for your audience
- Add personal details for more authenticity
- Use a CTA at the end of the content

---

*Demo mode: add OPENAI_API_KEY to .env for full AI generation with streaming.*`;
}

async function createDemoStream(
  prompt: string,
  model: string,
  onFinish?: StreamContentInput["onFinish"],
): Promise<ReadableStream<Uint8Array>> {
  const content = buildFallbackContent(prompt);
  const encoder = new TextEncoder();
  let index = 0;
  const chunkSize = 8;

  return new ReadableStream({
    async pull(controller) {
      if (index >= content.length) {
        controller.close();
        if (onFinish) {
          await onFinish({
            text: content,
            model,
            tokensUsed: estimateTokens(content),
          });
        }
        return;
      }

      const chunk = content.slice(index, index + chunkSize);
      index += chunkSize;
      controller.enqueue(encoder.encode(chunk));
      await new Promise((resolve) => setTimeout(resolve, 25));
    },
  });
}

async function createOpenAIStream(
  input: StreamContentInput,
  model: string,
  maxTokens: number,
): Promise<ReadableStream<Uint8Array>> {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const encoder = new TextEncoder();

  const result = streamText({
    model: openai(model),
    prompt: input.prompt,
    maxOutputTokens: maxTokens,
    onFinish: async ({ text, usage }) => {
      if (input.onFinish) {
        await input.onFinish({
          text,
          model,
          tokensUsed: usage?.totalTokens ?? estimateTokens(text),
        });
      }
    },
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export async function createContentStream(input: StreamContentInput) {
  const limits = getPlanLimits(input.plan);
  const model = input.model ?? MODEL_BY_PLAN[input.plan];
  const maxTokens = limits.maxTokensPerGeneration;

  if (!process.env.OPENAI_API_KEY) {
    const stream = await createDemoStream(input.prompt, "demo", input.onFinish);
    return { stream, model: "demo" as const };
  }

  const stream = await createOpenAIStream(input, model, maxTokens);
  return { stream, model };
}