import type { TemplateCategory } from "@/types/template";

export interface FeaturedTemplate {
  slug: string;
  title: string;
  description: string;
  category: TemplateCategory;
  groupLabel: string;
  requiredPlan: "free" | "pro";
  variables: string[];
  preview: string;
}

export const featuredTemplates: FeaturedTemplate[] = [
  {
    slug: "linkedin-post",
    title: "LinkedIn Post",
    description:
      "Hook-driven post with story arc and an engagement question",
    category: "linkedin_post",
    groupLabel: "Social Media",
    requiredPlan: "free",
    variables: ["Topic", "Tone", "Goal"],
    preview: `I spent 6 months building in public.

Here's what nobody tells you about launching as a solo founder:

→ Your MVP will feel embarrassing. Ship it anyway.
→ Distribution beats features for the first 90 days.

What's the hardest lesson you learned after launch?`,
  },
  {
    slug: "x-thread",
    title: "X Thread",
    description: "Numbered tweet thread with a bold hook and clear CTA",
    category: "x_thread",
    groupLabel: "Social Media",
    requiredPlan: "free",
    variables: ["Topic", "Tone", "Tweet count"],
    preview: `1/ Creators don't need more ideas. They need a system.

Here are 7 reusable AI workflows for drafting content:

2/ Start with a structured template — not a blank page...

7/ Want the full playbook? Follow for more.`,
  },
  {
    slug: "newsletter",
    title: "Newsletter",
    description: "Subject line, value blocks, and a single focused CTA",
    category: "newsletter",
    groupLabel: "Email",
    requiredPlan: "free",
    variables: ["Topic", "Brand", "Goal", "Tone"],
    preview: `Subject: 3 AI workflows that cut content time in half

Hey there,

This week I tested three prompts for turning a rough outline into an editable draft...

[Register for the live walkthrough →]`,
  },
  {
    slug: "cold-email-outreach",
    title: "Cold Email Outreach",
    description: "Short, personalized email built to earn a reply",
    category: "email",
    groupLabel: "Email",
    requiredPlan: "free",
    variables: ["Recipient role", "Your offer", "Pain point"],
    preview: `Subject: Quick idea for your content workflow

Hi there — I noticed your team is publishing more consistently.

Drafting consistently can slow down a small marketing team. Structured AI workflows can help organize the first draft.

Worth a 15-min chat this week?`,
  },
  {
    slug: "blog-article",
    title: "Blog Article",
    description: "Long-form SEO article with headings and a FAQ block",
    category: "blog",
    groupLabel: "Content Creation",
    requiredPlan: "free",
    variables: ["Topic", "Keywords", "Length"],
    preview: `# How to Build a Content System as a Solo Founder

## Why most founders publish inconsistently
The problem isn't ideas — it's the blank page...

## The 3-part system that actually sticks
1. Template library  2. Batch generation  3. Reuse what works`,
  },
  {
    slug: "seo-meta-tags",
    title: "SEO Meta Tags",
    description: "Click-worthy title tag and meta description for any page",
    category: "seo",
    groupLabel: "SEO",
    requiredPlan: "free",
    variables: ["Page topic", "Keyword", "Search intent"],
    preview: `Title (58 chars):
AI Content Tools for Marketers | Creatornivo

Meta (152 chars):
Compare AI content tools for marketers, including templates, workflows, and example outputs.`,
  },
  {
    slug: "youtube-script",
    title: "YouTube Script",
    description: "Full script with hook, timed sections, and outro CTA",
    category: "youtube",
    groupLabel: "Video",
    requiredPlan: "pro",
    variables: ["Topic", "Duration", "Tone"],
    preview: `[HOOK — 0:00]
"Stop writing scripts from scratch. Here's my exact system."

[MAIN — 2:30]
Section 1: Pick a template...
Section 2: Fill three fields...

[OUTRO]
"If this saved you time, subscribe — next week: Shorts scripts."`,
  },
  {
    slug: "landing-page-copy",
    title: "Landing Page Copy",
    description: "Hero, benefits, social proof, and conversion CTA",
    category: "marketing",
    groupLabel: "Marketing",
    requiredPlan: "pro",
    variables: ["Product", "Audience", "Pain point"],
    preview: `Headline: Create content faster with reusable AI workflows

Subhead: Structured AI templates for LinkedIn, email, SEO, and more.

✓ 15 templates  ✓ Real-time preview  ✓ Personal library

[Start free →]`,
  },
];
