import { prisma } from "../src/lib/db";
import { getTrialPeriodKey } from "../src/config/trial";
import {
  createTrialInvite,
  revokeUnusedTrialInviteById,
} from "../src/lib/trial/invites";
import { PUBLIC_SITE_ORIGIN } from "../src/lib/seo/public-site";

const MAX_INVITE_LIFETIME_HOURS = 24 * 365;

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function printUsage(): void {
  console.log(`Usage:
  npm run trial:invite -- create [--expires-in-hours 168]
  npm run trial:invite -- revoke <invite-id>
  npm run trial:invite -- status <account-email>`);
}

async function createInvite(): Promise<void> {
  const rawHours = readOption("--expires-in-hours") ?? "168";
  const expiresInHours = Number(rawHours);
  if (
    !Number.isInteger(expiresInHours) ||
    expiresInHours < 1 ||
    expiresInHours > MAX_INVITE_LIFETIME_HOURS
  ) {
    throw new Error(
      `--expires-in-hours must be an integer from 1 to ${MAX_INVITE_LIFETIME_HOURS}.`,
    );
  }

  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const invite = await createTrialInvite({ expiresAt });
  const url = new URL(`/try/${invite.token}`, PUBLIC_SITE_ORIGIN).toString();

  console.log(`Invite ID: ${invite.id}`);
  console.log(`Expires: ${invite.expiresAt.toISOString()}`);
  console.log(`Private URL (shown once): ${url}`);
}

async function revokeInvite(id: string | undefined): Promise<void> {
  if (!id) throw new Error("An invite ID is required.");
  const revoked = await revokeUnusedTrialInviteById(id);
  if (!revoked) {
    throw new Error("Invite was not found, was already used, or was already revoked.");
  }
  console.log(`Revoked unused invite: ${id}`);
}

async function showStatus(emailInput: string | undefined): Promise<void> {
  const email = emailInput?.trim().toLowerCase();
  if (!email) throw new Error("An account email is required.");

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      plan: true,
      emailVerified: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });
  if (!user) throw new Error("Account not found.");

  const now = new Date();
  const active = Boolean(
    user.plan !== "pro" &&
      user.emailVerified &&
      user.trialStartedAt &&
      user.trialEndsAt &&
      user.trialStartedAt.getTime() <= now.getTime() &&
      now.getTime() < user.trialEndsAt.getTime(),
  );
  const used = user.trialStartedAt
    ? await prisma.generationReservation.count({
        where: {
          userId: user.id,
          periodKey: getTrialPeriodKey(user.trialStartedAt),
          status: "completed",
        },
      })
    : 0;

  console.log(`Billing plan: ${user.plan}`);
  console.log(`Email verified: ${Boolean(user.emailVerified)}`);
  console.log(`Trial active: ${active}`);
  console.log(`Trial started: ${user.trialStartedAt?.toISOString() ?? "not started"}`);
  console.log(`Trial ends: ${user.trialEndsAt?.toISOString() ?? "not started"}`);
  console.log(`Trial generations used: ${used} / 30`);
}

async function main(): Promise<void> {
  const [command, argument] = process.argv.slice(2);
  if (command === "create") {
    await createInvite();
  } else if (command === "revoke") {
    await revokeInvite(argument);
  } else if (command === "status") {
    await showStatus(argument);
  } else {
    printUsage();
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Trial invite command failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
