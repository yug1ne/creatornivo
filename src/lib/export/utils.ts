export type ExportFormat = "md" | "txt";

const MIME_TYPES: Record<ExportFormat, string> = {
  md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8",
};

export function buildExportFilename(
  title: string,
  format: ExportFormat,
): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "export";

  const date = new Date().toISOString().slice(0, 10);

  return `creatornivo-${slug}-${date}.${format}`;
}

export function getExportMimeType(format: ExportFormat): string {
  return MIME_TYPES[format];
}

export function prepareExportContent(
  content: string,
  format: ExportFormat,
): string {
  if (format === "md") {
    return content;
  }

  return content
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}