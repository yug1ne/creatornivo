import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  discordAnnouncementFormGroups,
  discordAnnouncementFormVariables,
} from "@/config/template-forms/discord-announcement";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Discord Announcement field guide",
  description:
    "How to fill the Discord Announcement form - subject, goal, audience, delivery mode, mentions, formatting, verified claims, disclosures, and restrictions.",
};

export default async function DiscordAnnouncementGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Discord Announcement - field guide"
      templateSlug="discord-announcement"
      intro="How to fill the Discord Announcement form. The required fields are enough to create a clear Discord-ready update; optional fields control publishing mode, mentions, formatting, community voice, verified claims, disclosures, and factual restrictions."
      quickStart={[
        "Fill Announcement Subject, Announcement Type, Primary Goal, Target Audience, Essential Details, and Output Language first.",
        "Use Message & Delivery for Discord-specific publishing mode, tone, length, mention preference, and channel context.",
        "Use Brand & Formatting to match the community voice, emoji level, formatting style, and optional short version.",
        "Use Accuracy & Restrictions for verified claims, disclosures, privacy boundaries, and must-avoid wording.",
        "Leave optional fields blank when they are not confirmed; the announcement should omit unsupported details instead of guessing.",
      ]}
      groups={discordAnnouncementFormGroups}
      variables={discordAnnouncementFormVariables}
    />
  );
}
