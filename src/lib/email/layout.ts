import { siteConfig } from "@/config/site";

import { getAppBaseUrl } from "./app-url";

/** Brand palette aligned with app `globals.css` primary indigo. */
export const emailBrand = {
  primary: "#6366f1",
  primaryDark: "#4f46e5",
  primaryDeep: "#4338ca",
  primarySoft: "#eef2ff",
  primaryBorder: "#c7d2fe",
  primaryText: "#312e81",
  ink: "#18181b",
  body: "#3f3f46",
  muted: "#52525b",
  soft: "#71717a",
  faint: "#a1a1aa",
  border: "#e4e4e7",
  card: "#ffffff",
  canvas: "#f4f4f5",
  warningBg: "#fffbeb",
  warningBorder: "#fde68a",
  warningTitle: "#b45309",
  warningText: "#78350f",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  successTitle: "#047857",
  successText: "#065f46",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailGreeting(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${trimmed},` : "Hi there,";
}

export function emailGreetingHtml(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${escapeHtml(trimmed)},` : "Hi there,";
}

export function normalizeEmailBaseUrl(baseUrl?: string): string {
  return (baseUrl ?? getAppBaseUrl()).replace(/\/$/, "");
}

export type EmailCta = {
  href: string;
  label: string;
};

export type EmailHighlight = {
  title: string;
  bodyHtml: string;
  variant?: "info" | "success" | "warning";
};

export type TransactionalEmailLayoutInput = {
  /** Document + H1 title */
  title: string;
  /** Hidden preheader for inbox preview */
  preheader: string;
  greetingHtml: string;
  /** Main body HTML blocks (paragraphs, lists, etc.) */
  bodyHtml: string;
  highlight?: EmailHighlight;
  primaryCta?: EmailCta;
  secondaryCtas?: EmailCta[];
  /** Extra note above support (optional) */
  footerNoteHtml?: string;
  supportLine?: string;
  signOff?: string;
  baseUrl?: string;
};

function highlightStyles(variant: EmailHighlight["variant"] = "info") {
  if (variant === "success") {
    return {
      bg: emailBrand.successBg,
      border: emailBrand.successBorder,
      title: emailBrand.successTitle,
      text: emailBrand.successText,
    };
  }
  if (variant === "warning") {
    return {
      bg: emailBrand.warningBg,
      border: emailBrand.warningBorder,
      title: emailBrand.warningTitle,
      text: emailBrand.warningText,
    };
  }
  return {
    bg: emailBrand.primarySoft,
    border: emailBrand.primaryBorder,
    title: emailBrand.primaryDark,
    text: emailBrand.primaryText,
  };
}

export function renderPrimaryButton(cta: EmailCta): string {
  return `
    <a href="${escapeHtml(cta.href)}" target="_blank" rel="noopener noreferrer"
       style="display:inline-block;background-color:${emailBrand.primary};color:#ffffff;font-family:${emailBrand.font};font-size:15px;font-weight:600;line-height:1.25;text-decoration:none;padding:14px 28px;border-radius:10px;">
      ${escapeHtml(cta.label)}
    </a>`;
}

export function renderSecondaryButton(cta: EmailCta): string {
  return `
    <a href="${escapeHtml(cta.href)}" target="_blank" rel="noopener noreferrer"
       style="display:inline-block;background-color:${emailBrand.card};color:${emailBrand.primaryDark};font-family:${emailBrand.font};font-size:14px;font-weight:600;line-height:1.25;text-decoration:none;padding:12px 20px;border-radius:10px;border:1.5px solid ${emailBrand.primaryBorder};">
      ${escapeHtml(cta.label)}
    </a>`;
}

export function renderEmailParagraph(text: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${emailBrand.font};font-size:15px;line-height:1.65;color:${emailBrand.body};">${text}</p>`;
}

export function renderEmailList(items: string[]): string {
  const lis = items
    .map(
      (item) =>
        `<li style="margin-bottom:6px;">${item}</li>`,
    )
    .join("");
  return `<ul style="margin:0 0 16px 0;padding:0 0 0 20px;font-family:${emailBrand.font};font-size:15px;line-height:1.65;color:${emailBrand.body};">${lis}</ul>`;
}

/**
 * Shared Creatornivo transactional HTML shell — card layout, brand accent, CTAs, footer.
 * Table-based for broad email-client support; mobile-friendly max-width + padding.
 */
export function renderTransactionalEmailHtml(
  input: TransactionalEmailLayoutInput,
): string {
  const baseUrl = normalizeEmailBaseUrl(input.baseUrl);
  const brand = escapeHtml(siteConfig.name);
  const supportEmail = escapeHtml(siteConfig.legal.privacyEmail);
  const title = escapeHtml(input.title);
  const preheader = escapeHtml(input.preheader);
  const signOff = escapeHtml(input.signOff ?? `The ${siteConfig.name} team`);
  const supportLine =
    input.supportLine ??
    `Questions? Reply to this email or write to ${siteConfig.legal.privacyEmail} — we read every message.`;
  const supportHtml = escapeHtml(supportLine).replace(
    escapeHtml(siteConfig.legal.privacyEmail),
    `<a href="mailto:${supportEmail}" style="color:${emailBrand.primaryDark};text-decoration:none;font-weight:500;">${supportEmail}</a>`,
  );

  const highlight = input.highlight
    ? (() => {
        const s = highlightStyles(input.highlight!.variant);
        return `
                <tr>
                  <td style="padding:0 28px 20px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${s.bg};border-radius:12px;border:1px solid ${s.border};">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0 0 6px 0;font-family:${emailBrand.font};font-size:13px;font-weight:600;letter-spacing:0.02em;text-transform:uppercase;color:${s.title};">
                            ${escapeHtml(input.highlight!.title)}
                          </p>
                          <div style="margin:0;font-family:${emailBrand.font};font-size:15px;line-height:1.55;color:${s.text};">
                            ${input.highlight!.bodyHtml}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`;
      })()
    : "";

  const primaryCta = input.primaryCta
    ? `
                <tr>
                  <td align="center" style="padding:8px 28px 12px 28px;">
                    ${renderPrimaryButton(input.primaryCta)}
                  </td>
                </tr>`
    : "";

  const secondaryCtas =
    input.secondaryCtas && input.secondaryCtas.length > 0
      ? `
                <tr>
                  <td align="center" style="padding:4px 28px 24px 28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        ${input.secondaryCtas
                          .map(
                            (cta) =>
                              `<td style="padding:4px;">${renderSecondaryButton(cta)}</td>`,
                          )
                          .join("")}
                      </tr>
                    </table>
                  </td>
                </tr>`
      : primaryCta
        ? `
                <tr>
                  <td style="padding:0 0 12px 0;font-size:0;line-height:0;">&nbsp;</td>
                </tr>`
        : "";

  const footerNote = input.footerNoteHtml
    ? `<div style="margin:0 0 12px 0;font-family:${emailBrand.font};font-size:14px;line-height:1.6;color:${emailBrand.soft};">${input.footerNoteHtml}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${emailBrand.canvas};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${emailBrand.canvas};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
          <tr>
            <td style="padding:0 0 20px 0;text-align:center;">
              <span style="font-family:${emailBrand.font};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${emailBrand.ink};">
                ${brand}
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:${emailBrand.card};border-radius:16px;border:1px solid ${emailBrand.border};overflow:hidden;box-shadow:0 1px 2px rgba(24,24,27,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${emailBrand.primary} 0%,#818cf8 50%,#a5b4fc 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:32px 28px 8px 28px;">
                    <p style="margin:0 0 8px 0;font-family:${emailBrand.font};font-size:15px;line-height:1.5;color:${emailBrand.muted};">
                      ${input.greetingHtml}
                    </p>
                    <h1 style="margin:0 0 16px 0;font-family:${emailBrand.font};font-size:24px;line-height:1.3;font-weight:700;letter-spacing:-0.02em;color:${emailBrand.ink};">
                      ${title}
                    </h1>
                    ${input.bodyHtml}
                  </td>
                </tr>
                ${highlight}
                ${primaryCta}
                ${secondaryCtas}
                <tr>
                  <td style="padding:0 28px 32px 28px;border-top:1px solid ${emailBrand.canvas};">
                    ${footerNote}
                    <p style="margin:20px 0 0 0;font-family:${emailBrand.font};font-size:14px;line-height:1.6;color:${emailBrand.soft};">
                      ${supportHtml}
                    </p>
                    <p style="margin:16px 0 0 0;font-family:${emailBrand.font};font-size:14px;line-height:1.5;color:${emailBrand.muted};">
                      Thanks,<br />
                      <strong style="color:${emailBrand.ink};">${signOff}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 8px 8px 8px;text-align:center;">
              <p style="margin:0;font-family:${emailBrand.font};font-size:12px;line-height:1.5;color:${emailBrand.faint};">
                <a href="${escapeHtml(baseUrl)}" style="color:${emailBrand.soft};text-decoration:none;">${brand}</a>
                · Structured AI templates for creators
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Consistent plain-text sign-off for all transactional emails. */
export function renderEmailTextSignOff(options?: {
  support?: boolean;
}): string[] {
  const lines: string[] = [];
  if (options?.support !== false) {
    lines.push(
      `Questions? ${siteConfig.legal.privacyEmail} — we read every message.`,
      "",
    );
  }
  lines.push("Thanks,", `The ${siteConfig.name} team`);
  return lines;
}
