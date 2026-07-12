import type { Metadata } from "next";

import { TemplateFieldGuide } from "@/components/generate/template-field-guide";
import {
  githubReadmeFormGroups,
  githubReadmeFormVariables,
} from "@/config/template-forms/github-readme";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "GitHub README field guide",
  description:
    "How to fill the GitHub README form - project identity, purpose, features, setup, usage, presentation, contribution, security, and license details.",
};

export default async function GitHubReadmeGuidePage() {
  await requireSession();

  return (
    <TemplateFieldGuide
      title="GitHub README - field guide"
      templateSlug="github-readme"
      intro="How to fill the GitHub README form. The required fields are enough to create a useful first README; optional fields add verified setup commands, configuration, examples, project presentation, contribution, security, and license details without inventing technical facts."
      quickStart={[
        "Fill Project Name, Short Project Description, Project Type, Primary README Audience, Purpose and Use Case, and Key Features first.",
        "Use Setup & Usage only for verified requirements, package managers, commands, configuration, and examples.",
        "Use Project Presentation for status, demo links, documentation links, badges, media, architecture, roadmap, and extra restrictions.",
        "Use Community & Trust for contribution flow, issues, security reporting, license, code of conduct, and acknowledgements.",
        "Leave optional fields blank when they are not confirmed; the README should omit unsupported sections instead of guessing.",
      ]}
      groups={githubReadmeFormGroups}
      variables={githubReadmeFormVariables}
    />
  );
}
