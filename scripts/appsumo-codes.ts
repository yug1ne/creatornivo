import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/db";
import { writeAppSumoAuditEvent } from "../src/lib/appsumo/audit";
import {
  appSumoCodeSuffix,
  digestAppSumoCode,
  generateUniqueAppSumoCodes,
  normalizeAppSumoCode,
} from "../src/lib/appsumo/codes";
import {
  deactivateAppSumoCode,
  disableUnusedAppSumoCode,
} from "../src/lib/appsumo/revoke";

function readOption(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? null) : null;
}

function printUsage(): void {
  console.log(`Usage:
  npm run appsumo:codes -- generate --count 10 --batch test --out <absolute-path>.csv
  npm run appsumo:codes -- counts
  npm run appsumo:codes -- inspect-code <raw-code>
  npm run appsumo:codes -- inspect-user <email>
  npm run appsumo:codes -- revoke <raw-code> --reason <reason>
  npm run appsumo:codes -- refund <raw-code> --reason <reason>
  npm run appsumo:codes -- disable-unused <raw-code> --reason <reason>`);
}

function assertOutsideRepo(outPath: string): string {
  const resolved = path.resolve(outPath);
  const repoRoot = path.resolve(process.cwd());
  if (resolved === repoRoot || resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error("CSV output path must be outside the repository.");
  }
  if (!resolved.toLowerCase().endsWith(".csv")) {
    throw new Error("CSV output path must end with .csv");
  }
  return resolved;
}

async function generateBatch(): Promise<void> {
  const count = Number(readOption("--count") ?? "0");
  const batchId = readOption("--batch");
  const out = readOption("--out");
  if (!Number.isInteger(count) || count < 1 || count > 10000) {
    throw new Error("--count must be an integer from 1 to 10000");
  }
  if (!batchId?.trim()) throw new Error("--batch is required");
  if (!out) throw new Error("--out is required");

  const destination = assertOutsideRepo(out);
  const codes = generateUniqueAppSumoCodes(count);
  const rows = codes.map((code) => ({
    digest: digestAppSumoCode(code),
    suffix: appSumoCodeSuffix(code),
  }));

  if (new Set(rows.map((row) => row.digest)).size !== rows.length) {
    throw new Error("Generated digest collision");
  }

  await mkdir(path.dirname(destination), { recursive: true });
  const tempPath = `${destination}.${process.pid}.tmp`;

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.appSumoCode.createMany({
        data: rows.map((row) => ({
          codeDigest: row.digest,
          codeSuffix: row.suffix,
          batchId: batchId.trim(),
        })),
      });
      await writeAppSumoAuditEvent(transaction, {
        eventType: "batch_generated",
        metadata: { batchId: batchId.trim(), count },
      });
    });
    await writeFile(tempPath, `${codes.join("\n")}\n`, { encoding: "utf8" });
    await rename(tempPath, destination);
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }

  console.log(`Generated ${count} codes`);
  console.log(`Batch: ${batchId.trim()}`);
  console.log(`CSV: ${destination}`);
}

async function showCounts(): Promise<void> {
  const [codes, unused, disabled, active, revoked, refunded] = await Promise.all([
    prisma.appSumoCode.count(),
    prisma.appSumoCode.count({
      where: { redemption: null, disabledAt: null },
    }),
    prisma.appSumoCode.count({ where: { disabledAt: { not: null } } }),
    prisma.appSumoRedemption.count({ where: { status: "active" } }),
    prisma.appSumoRedemption.count({ where: { status: "revoked" } }),
    prisma.appSumoRedemption.count({ where: { status: "refunded" } }),
  ]);
  console.log(`codes=${codes}`);
  console.log(`unused=${unused}`);
  console.log(`disabled=${disabled}`);
  console.log(`active=${active}`);
  console.log(`revoked=${revoked}`);
  console.log(`refunded=${refunded}`);
}

async function inspectCode(raw: string | undefined): Promise<void> {
  const canonical = normalizeAppSumoCode(raw);
  if (!canonical) throw new Error("Invalid code format");
  const digest = digestAppSumoCode(canonical);
  const code = await prisma.appSumoCode.findUnique({
    where: { codeDigest: digest },
    include: {
      redemption: {
        select: {
          id: true,
          userId: true,
          status: true,
          redeemedAt: true,
          deactivatedAt: true,
          deactivationReason: true,
        },
      },
    },
  });
  if (!code) throw new Error("Code not found");
  await writeAppSumoAuditEvent(prisma, {
    eventType: "inspected",
    codeId: code.id,
    userId: code.redemption?.userId ?? null,
    reason: "inspect-code",
  });
  console.log(`id=${code.id}`);
  console.log(`suffix=${code.codeSuffix}`);
  console.log(`batch=${code.batchId}`);
  console.log(`disabled=${code.disabledAt ? "yes" : "no"}`);
  console.log(`redemption=${code.redemption?.status ?? "none"}`);
  console.log(`userId=${code.redemption?.userId ?? "none"}`);
}

async function inspectUser(emailInput: string | undefined): Promise<void> {
  const email = emailInput?.trim().toLowerCase();
  if (!email) throw new Error("An account email is required.");
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      plan: true,
      appSumoRedemptions: {
        select: {
          status: true,
          redeemedAt: true,
          deactivatedAt: true,
          code: { select: { codeSuffix: true, batchId: true } },
        },
        orderBy: { redeemedAt: "asc" },
      },
    },
  });
  if (!user) throw new Error("Account not found.");
  const active = user.appSumoRedemptions.filter((row) => row.status === "active");
  console.log(`userId=${user.id}`);
  console.log(`billingPlan=${user.plan}`);
  console.log(`activeCodes=${active.length}`);
  console.log(`tier=${active.length >= 2 ? 2 : active.length}`);
  for (const row of user.appSumoRedemptions) {
    console.log(
      `code=…${row.code.codeSuffix} status=${row.status} batch=${row.code.batchId}`,
    );
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (!command || command === "--help") {
    printUsage();
    return;
  }

  if (command === "generate") {
    await generateBatch();
    return;
  }
  if (command === "counts") {
    await showCounts();
    return;
  }
  if (command === "inspect-code") {
    await inspectCode(process.argv[3]);
    return;
  }
  if (command === "inspect-user") {
    await inspectUser(process.argv[3]);
    return;
  }
  if (command === "revoke" || command === "refund") {
    const reason = readOption("--reason");
    if (!reason?.trim()) throw new Error("--reason is required");
    const result = await deactivateAppSumoCode(process.argv[3], {
      kind: command === "refund" ? "refunded" : "revoked",
      reason: reason.trim(),
    });
    if (!result.ok) throw new Error(result.reason);
    console.log(`${command} completed`);
    return;
  }
  if (command === "disable-unused") {
    const reason = readOption("--reason");
    if (!reason?.trim()) throw new Error("--reason is required");
    const result = await disableUnusedAppSumoCode(
      process.argv[3],
      reason.trim(),
    );
    if (!result.ok) throw new Error(result.reason);
    console.log("unused code disabled");
    return;
  }

  printUsage();
  throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Command failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
