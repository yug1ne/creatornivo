import { Suspense } from "react";

import { AccountDeletedBanner } from "@/components/landing/account-deleted-banner";
import { EarlyAccessBanner } from "@/components/landing/early-access-banner";
import { ExploreTemplatesSection } from "@/components/landing/explore-templates-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";

export default function HomePage() {
  return (
    <>
      <Suspense fallback={null}>
        <AccountDeletedBanner />
      </Suspense>
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