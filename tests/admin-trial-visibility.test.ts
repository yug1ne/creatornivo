import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAdminTrialSummary } from "../src/lib/admin/trial-visibility";

const now = new Date("2026-08-12T12:00:00.000Z");

test("admin trial summary distinguishes never, pending, active, and expired", () => {
  assert.deepEqual(
    buildAdminTrialSummary(
      {
        trialStartedAt: null,
        trialEndsAt: null,
        claimedInviteId: null,
        used: 0,
      },
      now,
    ),
    {
      status: "never",
      label: "—",
      startedAt: null,
      endsAt: null,
      used: 0,
      limit: 30,
      claimedInviteId: null,
    },
  );

  assert.equal(
    buildAdminTrialSummary(
      {
        trialStartedAt: null,
        trialEndsAt: null,
        claimedInviteId: "invite-1",
        used: 0,
      },
      now,
    ).label,
    "Pending verification",
  );

  assert.equal(
    buildAdminTrialSummary(
      {
        trialStartedAt: new Date("2026-08-12T10:00:00.000Z"),
        trialEndsAt: new Date("2026-08-15T10:00:00.000Z"),
        claimedInviteId: "invite-2",
        used: 4,
      },
      now,
    ).label,
    "Active · 4/30",
  );

  assert.equal(
    buildAdminTrialSummary(
      {
        trialStartedAt: new Date("2026-08-08T10:00:00.000Z"),
        trialEndsAt: new Date("2026-08-11T10:00:00.000Z"),
        claimedInviteId: "invite-3",
        used: 12,
      },
      now,
    ).label,
    "Expired · 12/30",
  );
});

test("admin trial visibility reuses completed reservations and the trial period key", () => {
  const read = readFileSync("src/lib/admin/users-read.ts", "utf8");

  assert.match(read, /getTrialPeriodKey/);
  assert.match(read, /generationReservation\.(?:groupBy|count)/);
  assert.match(read, /status:\s*"completed"/);
  assert.doesNotMatch(read, /generationReservation\.(?:create|update|delete)/);
  assert.doesNotMatch(read, /trialInvite\.(?:create|update|delete)/);
});

test("admin trial UI is server-gated, read-only, and keeps Plan separate", () => {
  const list = readFileSync("src/app/(admin)/admin/users/page.tsx", "utf8");
  const detail = readFileSync(
    "src/app/(admin)/admin/users/[id]/page.tsx",
    "utf8",
  );
  const overview = readFileSync("src/app/(admin)/admin/page.tsx", "utf8");

  assert.match(list, /requireAdminPage/);
  assert.match(detail, /requireAdminPage/);
  assert.match(overview, /requireAdminPage/);
  assert.match(list, />Trial</);
  assert.match(list, /user\.trial\.label/);
  assert.match(detail, /Trial status/);
  assert.match(detail, /Trial generations used \/ 30/);
  assert.match(detail, /Claimed invite ID/);
  assert.match(overview, /Active trials/);
  assert.match(overview, /Pending verification/);
  assert.match(overview, /Expired trials/);

  assert.match(list, /user\.plan === "pro" \? "Pro" : "Free"/);
  assert.doesNotMatch(`${list}\n${detail}\n${overview}`, /method=["']post["']/i);
  assert.doesNotMatch(
    `${list}\n${detail}\n${overview}`,
    /extend trial|reset quota|activate trial|convert to pro|create invite|revoke invite/i,
  );
});
