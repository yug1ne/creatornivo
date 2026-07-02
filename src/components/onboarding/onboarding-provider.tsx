"use client";

import { useSession } from "next-auth/react";
import { Suspense } from "react";

import { OnboardingTour } from "./onboarding-tour";

function OnboardingTourGate() {
  const { data: session, status } = useSession();

  if (status !== "authenticated" || !session?.user?.id) {
    return null;
  }

  return <OnboardingTour userId={session.user.id} />;
}

export function OnboardingProvider() {
  return (
    <Suspense fallback={null}>
      <OnboardingTourGate />
    </Suspense>
  );
}