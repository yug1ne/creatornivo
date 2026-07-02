export const siteConfig = {
  name: "Creatornivo",
  description: "AI prompt toolkit and content generation platform",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  legal: {
    privacyEmail: "support@creatornivo.com",
    legalEmail: "support@creatornivo.com",
    billingEmail: "support@creatornivo.com",
    companyName: "Creatornivo",
  },
} as const;
