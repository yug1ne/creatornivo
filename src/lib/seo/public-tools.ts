import { facebookPostFormVariables } from "@/config/template-forms/facebook-post";
import { instagramPostFormVariables } from "@/config/template-forms/instagram-post";
import { linkedinPostFormVariables } from "@/config/template-forms/linkedin-post";
import { redditPostFormVariables } from "@/config/template-forms/reddit-post";
import { threadsPostFormVariables } from "@/config/template-forms/threads-post";
import { tiktokCaptionFormVariables } from "@/config/template-forms/tiktok-caption";
import { xThreadFormVariables } from "@/config/template-forms/x-thread";
import { youtubeScriptFormVariables } from "@/config/template-forms/youtube-script";
import type {
  PublicTemplateSlug,
  PublicTool,
  PublicToolDemoField,
} from "@/config/public-tools";
import {
  getPublicToolBySlug,
  listPublicToolPagePaths,
  listPublicTools,
} from "@/config/public-tools";
import { getAuthPageHref } from "@/lib/auth/callback-url";
import { PUBLIC_SITE_ORIGIN, publicAbsoluteUrl } from "@/lib/seo/public-site";
import type { TemplateVariable } from "@/types/template";

const formVariablesByTemplate: Record<
  PublicTemplateSlug,
  TemplateVariable[]
> = {
  "linkedin-post": linkedinPostFormVariables,
  "x-thread": xThreadFormVariables,
  "instagram-post": instagramPostFormVariables,
  "facebook-post": facebookPostFormVariables,
  "tiktok-caption": tiktokCaptionFormVariables,
  "youtube-script": youtubeScriptFormVariables,
  "reddit-post": redditPostFormVariables,
  "threads-post": threadsPostFormVariables,
};

export function getPublicToolCanonicalPath(slug?: string): string {
  return slug ? `/tools/${slug}` : "/tools";
}

export function getPublicToolCanonicalUrl(slug?: string): string {
  return publicAbsoluteUrl(getPublicToolCanonicalPath(slug));
}

export function getProtectedGeneratePath(templateSlug: string): string {
  return `/generate?template=${templateSlug}`;
}

/**
 * Existing auth convention: relative callbackUrl, encoded when it contains
 * a query string so login/register can read the full destination.
 */
export function getPublicToolAuthHref(
  templateSlug: string,
  dest: "login" | "register" = "register",
): string {
  return getAuthPageHref(dest, getProtectedGeneratePath(templateSlug));
}

export function getPublicToolFormVariables(
  templateSlug: PublicTemplateSlug,
): TemplateVariable[] {
  return formVariablesByTemplate[templateSlug];
}

export function getPublicToolFieldLabel(
  templateSlug: PublicTemplateSlug,
  key: string,
): string {
  const field = formVariablesByTemplate[templateSlug].find(
    (variable) => variable.key === key,
  );
  if (!field) {
    throw new Error(
      `Public tool demo field "${key}" is missing from ${templateSlug} form schema`,
    );
  }
  return field.label;
}

export function resolvePublicToolDemoFields(
  tool: PublicTool,
): { label: string; value: string; key: string }[] {
  return tool.demoFields.map((field: PublicToolDemoField) => ({
    key: field.key,
    value: field.value,
    label: getPublicToolFieldLabel(tool.templateSlug, field.key),
  }));
}

export function listResolvedPublicTools(): PublicTool[] {
  return listPublicTools();
}

export { getPublicToolBySlug, listPublicToolPagePaths, listPublicTools };

export const PUBLIC_TOOLS_ORIGIN = PUBLIC_SITE_ORIGIN;
