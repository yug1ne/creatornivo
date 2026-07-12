import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  salesProposalFormGroups,
  salesProposalFormVariables,
} from "@/config/template-forms/sales-proposal";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sales Proposal field guide",
  description:
    "How to fill the Sales Proposal form - provider, client, offer, situation, challenges, outcomes, decision audience, scope, pricing, proof, brand voice, and output settings.",
};

export default async function SalesProposalGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="Sales Proposal - field guide"
      templateSlug="sales-proposal"
      intro="How to fill the Sales Proposal form. The required fields identify the provider, client, offer, client context, challenges, desired outcomes, decision audience, and output language; optional fields add sales strategy, scope, delivery plan, pricing controls, evidence, brand voice, tone, and output features."
      quickStart={[
        "Fill Provider or company name, Client or organization, Solution or offer name, Offer overview, Client's current situation, Challenges to address, Desired outcomes, Decision audience, and Output language first.",
        "Use Client Strategy to tailor the proposal to the relationship stage, buying criteria, stakeholders, competitors, objections, and positioning priority.",
        "Use Scope & Delivery for deliverables, approach, milestones, timeline, responsibilities, assumptions, and exclusions.",
        "Turn Include pricing on only when approved pricing and payment terms are available.",
        "Use Evidence, Brand & Output for differentiators, proof, sources, brand voice, tone, requested sections, and any final constraints.",
      ]}
      groups={salesProposalFormGroups}
      variables={salesProposalFormVariables}
    />
  );
}
