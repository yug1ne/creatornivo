export const siteConfig = {
  name: "Creatornivo",
  description:
    "AI-assisted text content SaaS: structured business drafts from predefined templates. Review and edit before use.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  legal: {
    privacyEmail: "support@creatornivo.com",
    legalEmail: "support@creatornivo.com",
    billingEmail: "support@creatornivo.com",
    companyName: "Creatornivo",
  },
} as const;
