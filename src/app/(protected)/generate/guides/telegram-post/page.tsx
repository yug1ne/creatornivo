import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  telegramPostFormGroups,
  telegramPostFormVariables,
} from "@/config/template-forms/telegram-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Telegram Post field guide",
  description:
    "How to fill the Telegram Post form - topic, goal, audience, facts, voice, Telegram formatting, links, evidence, and output variants.",
};

export default async function TelegramPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Telegram Post - field guide"
      templateSlug="telegram-post"
      intro="How to fill the Telegram Post form. The required fields are enough for a channel-ready post; optional fields refine voice, emoji use, Telegram formatting, destination links, hashtags, evidence, disclosure, and variants without inventing unsupported facts."
      quickStart={[
        "Fill Topic, Primary Goal, Target Audience, Core Message, and Facts and Required Details first.",
        "Use Post Format, Output Language, Length, and Reader Action to control practical Telegram publishing constraints.",
        "Open Message & Voice when tone, brand voice, emoji level, or Telegram markup matters.",
        "Use Links & Publishing for a destination URL, optional button text, dates, timing, and hashtag preference.",
        "Use Accuracy & Output for evidence, disclosures, restrictions, variant count, and uncommon constraints.",
      ]}
      groups={telegramPostFormGroups}
      variables={telegramPostFormVariables}
    />
  );
}
