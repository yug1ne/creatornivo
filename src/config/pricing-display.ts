import { planLimits, PLANS } from "@/config/plans";
import { TEMPLATE_CATALOG_COUNTS } from "@/config/template-categories";

export const pricingPlans = [
  {
    id: PLANS.FREE,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "A simple way to try the Creatornivo workflow.",
    badge: "free" as const,
    highlighted: false,
    cta: { label: "Get started for free", href: "/register" },
    features: [
      `Up to ${planLimits.free.maxSavedPrompts} saved prompts`,
      `${planLimits.free.maxGenerationsPerPeriod} generations per day`,
      `${TEMPLATE_CATALOG_COUNTS.free} core templates`,
      "GPT-4o mini generation",
      "Personal prompt library",
    ],
  },
  {
    id: PLANS.PRO,
    name: "Pro",
    price: "$9.90",
    period: "per month",
    description: "For creators, marketers, and indie hackers who publish every week.",
    badge: "pro" as const,
    highlighted: true,
    cta: { label: "Upgrade to Pro", href: "/pricing" },
    features: [
      "100 generations per month",
      "Unlimited saved prompts",
      `All ${TEMPLATE_CATALOG_COUNTS.total} templates`,
      "GPT-4o generation",
      "Export to .md and .txt",
      "Email support",
    ],
  },
] as const;

export const generationExamples = [
  {
    id: "linkedin",
    label: "LinkedIn Post",
    before: {
      title: "Your inputs",
      lines: [
        "Topic: Lessons from my first SaaS launch",
        "Tone: honest, founder-to-founder",
        "Goal: drive comments and shares",
      ],
    },
    after: {
      title: "Generated output",
      preview: `I spent 6 months building in public.

Here's what nobody tells you about launching a SaaS as a solo founder:

→ Your MVP will feel embarrassing. Ship it anyway.
→ Distribution beats features for the first 90 days.
→ Comments on LinkedIn > likes on Twitter for B2B.

What's the hardest lesson you learned after launch?`,
    },
  },
  {
    id: "thread",
    label: "X Thread",
    before: {
      title: "Your inputs",
      lines: [
        "Topic: AI tools for content creators",
        "Audience: indie hackers & marketers",
        "Tweets: 5",
      ],
    },
    after: {
      title: "Generated output",
      preview: `1/ Creators don't need more ideas. They need a repeatable workflow.

Here are 5 reusable AI workflows for drafting content:

2/ Start with a structured template — not a blank page...`,
    },
  },
] as const;

export const howItWorksSteps = [
  {
    step: "01",
    title: "Pick a template",
    description:
      "Choose a structured template for LinkedIn, X, newsletters, blogs, and more.",
  },
  {
    step: "02",
    title: "Fill in the blanks",
    description:
      "Add your topic, tone, and audience. Preview the exact prompt before you generate.",
  },
  {
    step: "03",
    title: "Generate a draft",
    description:
      "Stream editable AI-generated content. Review, copy, or save it to your library.",
  },
  {
    step: "04",
    title: "Reuse what works",
    description:
      "Build a library of useful outputs. Search, filter, and export when you're on Pro.",
  },
] as const;
