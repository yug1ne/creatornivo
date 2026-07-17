/** Max saved prompts returned on the library list page / list API. */
export const LIBRARY_LIST_LIMIT = 50;

/** Snippet length for library cards (full content remains on detail page). */
export const LIBRARY_CONTENT_PREVIEW_CHARS = 280;

export function toLibraryContentPreview(
  content: string,
  maxChars = LIBRARY_CONTENT_PREVIEW_CHARS,
): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trimEnd()}…`;
}
