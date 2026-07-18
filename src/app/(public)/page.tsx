import type { Metadata } from "next";
import { Suspense } from "react";

import { EarlyAccessStatusBanner } from "@/components/layout/early-access-status-banner";
import { AccountDeletedBanner } from "@/components/landing/account-deleted-banner";
import { EarlyAccessBanner } from "@/components/landing/early-access-banner";
import { ExploreTemplatesSection } from "@/components/landing/explore-templates-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";
import { siteMetadata } from "@/config/site";

/** Homepage uses absolute title so the tab is never brand-only. */
export const metadata: Metadata = {
  title: {
    absolute: siteMetadata.title,
  },
  description: siteMetadata.description,
  openGraph: {
    title: siteMetadata.title,
    description: siteMetadata.description,
  },
  twitter: {
    title: siteMetadata.title,
    description: siteMetadata.description,
  },
};

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AccountDeletedBanner />
      </Suspense>
      <EarlyAccessStatusBanner />
      <EarlyAccessBanner />
      <HeroSection />
      <ShowcaseSection />
      <SocialProofSection />
      <HowItWorksSection />
      <ExploreTemplatesSection />
      <PricingSection />
      <FinalCtaSection />
    </>
  );
}