import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

import {
  generationPolicies,
  getGenerationPolicy,
  type Plan,
} from "@/config/plans";

export interface StreamContentInput {
  prompt: string;
  plan: Plan;
  onStart?: () => Promise<void>;
  onFinish?: (result: {
    text: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }) => Promise<void>;
  onError?: (result: {
    error: unknown;
    inputTokens?: number;
    outputTokens?: number;
  }) => Promise<void>;
}

export const MODEL_BY_PLAN: Record<Plan, string> = {
  free: generationPolicies.free.model,
  pro: generationPolicies.pro.model,
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function isAIProviderConfigured(
  apiKey = process.env.OPENAI_API_KEY,
): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

async function createOpenAIStream(
  input: StreamContentInput,
  model: string,
  maxTokens: number,
): Promise<ReadableStream<Uint8Array>> {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const encoder = new TextEncoder();

  await input.onStart?.();

  const result = streamText({
    model: openai(model),
    prompt: input.prompt,
    maxOutputTokens: maxTokens,
    onFinish: async ({ text, usage }) => {
      if (input.onFinish) {
        await input.onFinish({
          text,
          model,
          inputTokens: usage?.inputTokens ?? estimateTokens(input.prompt),
          outputTokens: usage?.outputTokens ?? estimateTokens(text),
        });
      }
    },
    onError: async ({ error }) => {
      await input.onError?.({ error });
    },
    onAbort: async ({ steps }) => {
      const usage = steps.reduce(
        (total, step) => ({
          inputTokens: total.inputTokens + (step.usage.inputTokens ?? 0),
          outputTokens: total.outputTokens + (step.usage.outputTokens ?? 0),
        }),
        { inputTokens: 0, outputTokens: 0 },
      );
      await input.onError?.({
        error: new Error("OpenAI generation was aborted"),
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      });
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
        await input.onError?.({ error });
        controller.error(error);
      }
    },
  });
}

export async function createContentStream(input: StreamContentInput) {
  const policy = getGenerationPolicy(input.plan);
  const model = policy.model;
  const maxTokens = policy.maxOutputTokens;

  if (!isAIProviderConfigured()) {
    throw new Error("AI generation is not configured");
  }

  const stream = await createOpenAIStream(input, model, maxTokens);
  return { stream, model };
}
