import { EarlyAccessStatusBanner } from "@/components/layout/early-access-status-banner";
import { OnboardingProvider } from "@/components/onboarding/onboarding-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { isAdminSession } from "@/lib/admin/is-admin-session";
import { getSession } from "@/lib/auth/session";
import {
  adminSupportAttentionCount,
  userSupportAttentionCount,
} from "@/lib/support/counts";
import {
  getAdminSupportStatusCounts,
  getUserSupportStatusCounts,
} from "@/lib/support/service";
import { prismaSupportStore } from "@/lib/support/store";
import {
  getUserAccessContext,
  isAppSumoAccessMode,
} from "@/lib/trial/access";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  let answeredSupportCount = 0;
  let adminOpenSupportCount = 0;
  let showUpgradeCard = true;

  if (session) {
    const isAdmin = isAdminSession(session);
    const [userCounts, access] = await Promise.all([
      getUserSupportStatusCounts(session.id, prismaSupportStore),
      getUserAccessContext(session),
    ]);
    answeredSupportCount = userSupportAttentionCount(userCounts);
    showUpgradeCard =
      !isAdmin && (!access || !isAppSumoAccessMode(access.mode));

    if (isAdmin) {
      const adminCounts = await getAdminSupportStatusCounts(prismaSupportStore);
      adminOpenSupportCount = adminSupportAttentionCount(adminCounts);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-1">
      <Sidebar
        answeredSupportCount={answeredSupportCount}
        adminOpenSupportCount={adminOpenSupportCount}
        showUpgradeCard={showUpgradeCard}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <EarlyAccessStatusBanner />
        {/* Extra bottom padding on small screens so the mobile menu FAB does not cover CTAs. */}
        <div className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-24 lg:px-8 lg:pb-8">
          {children}
        </div>
      </main>
      <OnboardingProvider />
    </div>
  );
}
