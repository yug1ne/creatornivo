export const siteConfig = {
  name: "Creatornivo",
  description: "AI prompt toolkit and content generation platform",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  legal: {
    privacyEmail: "privacy@creatornivo.com",
    legalEmail: "legal@creatornivo.com",
    billingEmail: "billing@creatornivo.com",
    companyName: "Creatornivo",
  },
} as const;