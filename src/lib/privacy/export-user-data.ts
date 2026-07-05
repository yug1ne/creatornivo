import type { Plan } from "@/config/plans";
import { siteConfig } from "@/config/site";
import type { GenerationUsage } from "@/lib/generation/usage-service";

export const DATA_EXPORT_VERSION = "1.0";
export const DATA_EXPORT_RECORD_LIMIT = 5000;

export interface DataExportTemplateRef {
  id: string;
  slug: string;
  title: string;
}

export interface DataExportAccount {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  role: string;
  emailVerified: string | null;
  onboardingCompletedAt: string | null;
  passwordChangedAt: string | null;
  authProviders: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DataExportSubscription {
  provider: string;
  status: string;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  paddlePriceId: string | null;
  paddleStatus: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  earlyAccessClaimedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataExportCheckoutIntent {
  id: string;
  priceId: string;
  status: string;
  paddleTransactionId: string | null;
  paddleSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  completedAt: string | null;
}

export interface DataExportAdjustment {
  paddleAdjustmentId: string;
  paddleTransactionId: string;
  paddleSubscriptionId: string | null;
  action: string;
  type: string | null;
  status: string;
  currencyCode: string | null;
  total: string | null;
  occurredAt: string;
}

export interface DataExportSavedPrompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  template: DataExportTemplateRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface DataExportGeneration {
  id: string;
  prompt: string;
  result: string;
  model: string;
  tokensUsed: number;
  template: DataExportTemplateRef | null;
  createdAt: string;
}

export interface DataExportReservation {
  requestId: string;
  plan: Plan;
  periodKey: string;
  status: string;
  model: string;
  estimatedMaxOutputTokens: number;
  actualInputTokens: number | null;
  actualOutputTokens: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
}

export interface DataExportListEnvelope<T> {
  items: T[];
  totalCount: number;
  truncated: boolean;
}

export interface UserDataExport {
  exportVersion: string;
  exportedAt: string;
  service: {
    name: string;
    url: string;
    privacyPolicyUrl: string;
  };
  account: DataExportAccount;
  subscription: DataExportSubscription | null;
  billingHistory: {
    checkoutIntents: DataExportListEnvelope<DataExportCheckoutIntent>;
    adjustments: DataExportListEnvelope<DataExportAdjustment>;
  };
  library: DataExportListEnvelope<DataExportSavedPrompt>;
  generations: DataExportListEnvelope<DataExportGeneration>;
  usage: {
    currentPeriod: GenerationUsage;
    reservations: DataExportListEnvelope<DataExportReservation>;
  };
  disclosures: {
    excludedCategories: string[];
    retentionNote: string;
    recordLimit: number;
  };
}

interface DataExportTemplateRecord {
  id: string;
  slug: string;
  title: string;
}

interface DataExportUserRecord {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  role: string;
  emailVerified: Date | null;
  onboardingCompletedAt: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DataExportAccountRecord {
  provider: string;
  type: string;
  providerAccountId: string;
}

export interface UserDataExportStore {
  findUserById(userId: string): Promise<DataExportUserRecord | null>;
  findAccountsByUserId(userId: string): Promise<DataExportAccountRecord[]>;
  findSubscriptionByUserId(
    userId: string,
  ): Promise<DataExportSubscription | null>;
  findCheckoutIntentsByUserId(
    userId: string,
  ): Promise<DataExportCheckoutIntent[]>;
  countCheckoutIntentsByUserId(userId: string): Promise<number>;
  findAdjustmentsByUserId(userId: string): Promise<DataExportAdjustment[]>;
  countAdjustmentsByUserId(userId: string): Promise<number>;
  findSavedPromptsByUserId(userId: string): Promise<
    Array<{
      id: string;
      title: string;
      content: string;
      tags: string[];
      createdAt: Date;
      updatedAt: Date;
      template: DataExportTemplateRecord | null;
    }>
  >;
  countSavedPromptsByUserId(userId: string): Promise<number>;
  findGenerationsByUserId(userId: string): Promise<
    Array<{
      id: string;
      prompt: string;
      result: string;
      model: string;
      tokensUsed: number;
      createdAt: Date;
      template: DataExportTemplateRecord | null;
    }>
  >;
  countGenerationsByUserId(userId: string): Promise<number>;
  findReservationsByUserId(userId: string): Promise<
    Array<{
      requestId: string;
      plan: Plan;
      periodKey: string;
      status: string;
      model: string;
      estimatedMaxOutputTokens: number;
      actualInputTokens: number | null;
      actualOutputTokens: number | null;
      createdAt: Date;
      startedAt: Date | null;
      completedAt: Date | null;
      expiresAt: Date;
    }>
  >;
  countReservationsByUserId(userId: string): Promise<number>;
  getGenerationUsage(userId: string, plan: Plan): Promise<GenerationUsage>;
}

function toIsoString(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function mapTemplate(
  template: DataExportTemplateRecord | null,
): DataExportTemplateRef | null {
  if (!template) return null;
  return {
    id: template.id,
    slug: template.slug,
    title: template.title,
  };
}

function buildListEnvelope<T>(
  items: T[],
  totalCount: number,
  limit = DATA_EXPORT_RECORD_LIMIT,
): DataExportListEnvelope<T> {
  const truncated = totalCount > limit;
  return {
    items: items.slice(0, limit),
    totalCount,
    truncated,
  };
}

function getServiceUrl(): string {
  const baseUrl =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    siteConfig.url;
  return baseUrl.replace(/\/$/, "");
}

function buildAuthProviders(
  userPasswordPresent: boolean,
  accounts: DataExportAccountRecord[],
): string[] {
  const providers = new Set<string>();
  if (userPasswordPresent) {
    providers.add("credentials");
  }
  for (const account of accounts) {
    providers.add(account.provider);
  }
  return Array.from(providers).sort();
}

export function buildExportFilename(exportedAt = new Date()): string {
  const date = exportedAt.toISOString().slice(0, 10);
  return `creatornivo-data-export-${date}.json`;
}

export async function buildUserDataExport(
  userId: string,
  store: UserDataExportStore,
  options?: {
    exportedAt?: Date;
    userPasswordPresent?: boolean;
  },
): Promise<UserDataExport> {
  const exportedAt = options?.exportedAt ?? new Date();
  const user = await store.findUserById(userId);

  if (!user) {
    throw new Error("user_not_found");
  }

  const [
    accounts,
    subscription,
    checkoutIntents,
    checkoutIntentCount,
    adjustments,
    adjustmentCount,
    savedPrompts,
    savedPromptCount,
    generations,
    generationCount,
    reservations,
    reservationCount,
    currentPeriod,
  ] = await Promise.all([
    store.findAccountsByUserId(userId),
    store.findSubscriptionByUserId(userId),
    store.findCheckoutIntentsByUserId(userId),
    store.countCheckoutIntentsByUserId(userId),
    store.findAdjustmentsByUserId(userId),
    store.countAdjustmentsByUserId(userId),
    store.findSavedPromptsByUserId(userId),
    store.countSavedPromptsByUserId(userId),
    store.findGenerationsByUserId(userId),
    store.countGenerationsByUserId(userId),
    store.findReservationsByUserId(userId),
    store.countReservationsByUserId(userId),
    store.getGenerationUsage(userId, user.plan),
  ]);

  const serviceUrl = getServiceUrl();

  return {
    exportVersion: DATA_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    service: {
      name: siteConfig.name,
      url: serviceUrl,
      privacyPolicyUrl: `${serviceUrl}/privacy`,
    },
    account: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      plan: user.plan,
      role: user.role,
      emailVerified: toIsoString(user.emailVerified),
      onboardingCompletedAt: toIsoString(user.onboardingCompletedAt),
      passwordChangedAt: toIsoString(user.passwordChangedAt),
      authProviders: buildAuthProviders(
        options?.userPasswordPresent ?? false,
        accounts,
      ),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    subscription,
    billingHistory: {
      checkoutIntents: buildListEnvelope(checkoutIntents, checkoutIntentCount),
      adjustments: buildListEnvelope(adjustments, adjustmentCount),
    },
    library: {
      ...buildListEnvelope(
        savedPrompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          content: prompt.content,
          tags: prompt.tags,
          template: mapTemplate(prompt.template),
          createdAt: prompt.createdAt.toISOString(),
          updatedAt: prompt.updatedAt.toISOString(),
        })),
        savedPromptCount,
      ),
    },
    generations: buildListEnvelope(
      generations.map((generation) => ({
        id: generation.id,
        prompt: generation.prompt,
        result: generation.result,
        model: generation.model,
        tokensUsed: generation.tokensUsed,
        template: mapTemplate(generation.template),
        createdAt: generation.createdAt.toISOString(),
      })),
      generationCount,
    ),
    usage: {
      currentPeriod,
      reservations: buildListEnvelope(
        reservations.map((reservation) => ({
          requestId: reservation.requestId,
          plan: reservation.plan,
          periodKey: reservation.periodKey,
          status: reservation.status,
          model: reservation.model,
          estimatedMaxOutputTokens: reservation.estimatedMaxOutputTokens,
          actualInputTokens: reservation.actualInputTokens,
          actualOutputTokens: reservation.actualOutputTokens,
          createdAt: reservation.createdAt.toISOString(),
          startedAt: toIsoString(reservation.startedAt),
          completedAt: toIsoString(reservation.completedAt),
          expiresAt: reservation.expiresAt.toISOString(),
        })),
        reservationCount,
      ),
    },
    disclosures: {
      excludedCategories: [
        "password hashes",
        "session tokens",
        "OAuth secrets",
        "server access logs",
      ],
      retentionNote:
        "Billing adjustment records may be retained separately after account deletion for legal and dispute purposes.",
      recordLimit: DATA_EXPORT_RECORD_LIMIT,
    },
  };
}