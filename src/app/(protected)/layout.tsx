import { EarlyAccessStatusBanner } from "@/components/layout/early-access-status-banner";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { Sidebar } from "@/components/layout/sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-1">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <EarlyAccessStatusBanner />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </main>
      <OnboardingProvider />
    </div>
  );
}
