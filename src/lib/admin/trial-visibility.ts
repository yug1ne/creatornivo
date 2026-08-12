import { TRIAL_GENERATION_LIMIT } from "@/config/trial";

export type AdminTrialStatus =
  | "never"
  | "pending_verification"
  | "active"
  | "expired";

export type AdminTrialSummary = {
  status: AdminTrialStatus;
  label: string;
  startedAt: string | null;
  endsAt: string | null;
  used: number;
  limit: number;
  claimedInviteId: string | null;
};

export function buildAdminTrialSummary(
  input: {
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    claimedInviteId: string | null;
    used: number;
  },
  now = new Date(),
): AdminTrialSummary {
  const used = Math.max(0, input.used);
  const base = {
    startedAt: input.trialStartedAt?.toISOString() ?? null,
    endsAt: input.trialEndsAt?.toISOString() ?? null,
    used,
    limit: TRIAL_GENERATION_LIMIT,
    claimedInviteId: input.claimedInviteId,
  };

  if (!input.trialStartedAt) {
    if (input.claimedInviteId) {
      return {
        ...base,
        status: "pending_verification",
        label: "Pending verification",
      };
    }

    return { ...base, status: "never", label: "—" };
  }

  if (
    input.trialEndsAt &&
    input.trialEndsAt.getTime() > now.getTime()
  ) {
    return {
      ...base,
      status: "active",
      label: `Active · ${used}/${TRIAL_GENERATION_LIMIT}`,
    };
  }

  return {
    ...base,
    status: "expired",
    label: `Expired · ${used}/${TRIAL_GENERATION_LIMIT}`,
  };
}
