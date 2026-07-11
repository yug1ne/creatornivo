import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  redditPostFormGroups,
  redditPostFormVariables,
} from "@/config/template-forms/reddit-post";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Reddit Post field guide",
  description:
    "How to fill the Reddit Post form — topic, goal, subreddit, audience, rules, disclosure, links, privacy, and high-stakes context.",
};

export default async function RedditPostGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Reddit Post — field guide"
      templateSlug="reddit-post"
      intro="How to fill the Reddit Post form for an honest, subreddit-appropriate post package. Empty optional fields are fine — the model will make conservative Reddit-native choices, omit unsafe elements, or add posting notes instead of inventing rules, experience, links, or proof."
      quickStart={[
        "Fill Topic or situation, Primary goal, Target subreddit, Intended readers, and Key facts and context.",
        "Use Author perspective, Desired response, Tone, and Output language to keep the post natural and aligned with your role.",
        "Open Subreddit Fit & Post Settings when you have community rules, title requirements, flair, length, or formatting preferences.",
        "Use Promotion & Disclosure and Accuracy & Boundaries when links, affiliation, sources, private details, or high-stakes topics are involved.",
      ]}
      groups={redditPostFormGroups}
      variables={redditPostFormVariables}
    />
  );
}
