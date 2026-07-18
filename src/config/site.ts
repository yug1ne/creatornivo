/** Public SEO / social defaults (homepage + root metadata). */
export const siteMetadata = {
  title: "CreatorNivo | AI-assisted text content SaaS",
  description:
    "AI-assisted text content SaaS for structured business drafts from predefined templates. Review, edit, and save drafts before use.",
} as const;

export const siteConfig = {
  name: "Creatornivo",
  description: siteMetadata.description,
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  legal: {
    privacyEmail: "support@creatornivo.com",
    legalEmail: "support@creatornivo.com",
    billingEmail: "support@creatornivo.com",
    companyName: "Creatornivo",
  },
} as const;
