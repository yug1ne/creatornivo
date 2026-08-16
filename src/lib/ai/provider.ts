import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";

import { getGenerationPolicy, type Plan } from "@/config/plans";
import { getTemplateMaxOutputTokens } from "@/config/template-output-limits";

export type ProviderReasoningEffort = "none" | "low";

export interface StreamContentInput {
  prompt: string;
  plan: Plan;
  /** Explicit model override (AppSumo Luna). Defaults to plan policy. */
  model?: string;
  /** AppSumo only. Free/Pro keep the model default by omitting this. */
  reasoningEffort?: ProviderReasoningEffort | null;
  /** Server-resolved template slug; drives maxOutputTokens with plan fallback. */
  templateSlug?: string | null;
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

export interface TextContentInput {
  prompt: string;
  plan: Plan;
  model?: string;
  reasoningEffort?: ProviderReasoningEffort | null;
  /** Server-resolved template slug; drives maxOutputTokens with plan fallback. */
  templateSlug?: string | null;
  onStart?: () => Promise<void>;
}

export interface TextContentResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Resolved model ids for UI labels (respects env override via getGenerationPolicy). */
export function getModelByPlan(plan: Plan): string {
  return getGenerationPolicy(plan).model;
}

/** @deprecated Prefer getModelByPlan — kept for call sites expecting a map. */
export const MODEL_BY_PLAN: Record<Plan, string> = {
  get free() {
    return getModelByPlan("free");
  },
  get pro() {
    return getModelByPlan("pro");
  },
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function isAIProviderConfigured(
  apiKey = process.env.OPENAI_API_KEY,
): boolean {
  return typeof apiKey === "string" && apiKey.trim().length > 0;
}

function providerOptionsForReasoning(
  reasoningEffort?: ProviderReasoningEffort | null,
) {
  if (!reasoningEffort) return undefined;
  return {
    openai: {
      reasoningEffort,
    },
  };
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
    providerOptions: providerOptionsForReasoning(input.reasoningEffort),
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

async function createOpenAIText(
  input: TextContentInput,
  model: string,
  maxTokens: number,
): Promise<TextContentResult> {
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

  await input.onStart?.();

  const result = await generateText({
    model: openai(model),
    prompt: input.prompt,
    maxOutputTokens: maxTokens,
    providerOptions: providerOptionsForReasoning(input.reasoningEffort),
  });

  return {
    text: result.text,
    model,
    inputTokens: result.usage?.inputTokens ?? estimateTokens(input.prompt),
    outputTokens: result.usage?.outputTokens ?? estimateTokens(result.text),
  };
}

export async function createContentStream(input: StreamContentInput) {
  const policy = getGenerationPolicy(input.plan);
  const model = input.model ?? policy.model;
  const maxTokens = getTemplateMaxOutputTokens(input.templateSlug, input.plan);

  if (!isAIProviderConfigured()) {
    throw new Error("AI generation is not configured");
  }

  const stream = await createOpenAIStream(input, model, maxTokens);
  return { stream, model, maxOutputTokens: maxTokens };
}

export async function createContentText(input: TextContentInput) {
  const policy = getGenerationPolicy(input.plan);
  const model = input.model ?? policy.model;
  const maxTokens = getTemplateMaxOutputTokens(input.templateSlug, input.plan);

  if (!isAIProviderConfigured()) {
    throw new Error("AI generation is not configured");
  }

  const result = await createOpenAIText(input, model, maxTokens);
  return { ...result, maxOutputTokens: maxTokens };
}
