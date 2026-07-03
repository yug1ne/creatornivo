import { planLimits, PLANS } from "@/config/plans";

export const pricingPlans = [
  {
    id: PLANS.FREE,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for trying Creatornivo and shipping your first pieces of content.",
    badge: "free" as const,
    highlighted: false,
    cta: { label: "Get started for free", href: "/register" },
    features: [
      `Up to ${planLimits.free.maxSavedPrompts} saved prompts`,
      `${planLimits.free.maxGenerationsPerDay} generations per day`,
      "8 core templates",
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
      "Unlimited generations",
      "Unlimited saved prompts",
      "All templates, including Pro",
      "GPT-4o priority models",
      "Export to .md and .txt",
      "Priority support",
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
      preview: `1/ Creators don't need more ideas. They need a system.

Here are 5 AI workflows I use to publish 10x faster (without sounding robotic):

2/ Start with a proven template — not a blank page...`,
    },
  },
] as const;

export const howItWorksSteps = [
  {
    step: "01",
    title: "Pick a template",
    description:
      "Choose from battle-tested prompts for LinkedIn, X, newsletters, blogs, and more.",
  },
  {
    step: "02",
    title: "Fill in the blanks",
    description:
      "Add your topic, tone, and audience. Preview the exact prompt before you generate.",
  },
  {
    step: "03",
    title: "Generate in seconds",
    description:
      "Stream polished content in real time. Edit, copy, or save straight to your library.",
  },
  {
    step: "04",
    title: "Reuse what works",
    description:
      "Build a library of your best outputs. Search, filter, and export when you're on Pro.",
  },
] as const;
