import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  reviewResponseFormGroups,
  reviewResponseFormVariables,
} from "@/config/template-forms/review-response";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Review Response field guide",
  description:
    "How to fill the Review Response form - review text, sentiment, goal, destination, verified facts, case status, resolution details, contact method, tone, and output settings.",
};

export default async function ReviewResponseGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Review Response - field guide"
      templateSlug="review-response"
      intro="How to fill the Review Response form. The required fields identify the business, review, sentiment, response goal, and output language; optional fields add platform context, verified facts, case status, approved next steps, safe contact details, brand voice, and output controls."
      quickStart={[
        "Fill Business or brand name, Customer review, Review sentiment, Primary response goal, and Output language first.",
        "Use Review platform and Response destination when the response must fit a specific public or private channel.",
        "Add Verified facts before asking the response to clarify, correct, or explain anything.",
        "Use Review Context & Resolution only for confirmed case status, approved next steps, contact methods, and restrictions.",
        "Use Brand & Tone and Output Settings to control voice, sign-off, avoided phrases, length, variants, and optional internal risk notes.",
      ]}
      groups={reviewResponseFormGroups}
      variables={reviewResponseFormVariables}
    />
  );
}
