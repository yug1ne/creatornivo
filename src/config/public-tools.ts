import type { TemplateCategory } from "@/types/template";
import type { Plan } from "@/config/plans";

export const PUBLIC_TOOLS_INDEX_PATH = "/tools" as const;

export type PublicToolSlug =
  | "linkedin-post-generator"
  | "x-thread-generator"
  | "instagram-post-generator"
  | "facebook-post-generator"
  | "tiktok-caption-generator"
  | "youtube-script-generator"
  | "reddit-post-generator"
  | "threads-post-generator";

export type PublicTemplateSlug =
  | "linkedin-post"
  | "x-thread"
  | "instagram-post"
  | "facebook-post"
  | "tiktok-caption"
  | "youtube-script"
  | "reddit-post"
  | "threads-post";

export type PublicToolDemoField = {
  key: string;
  value: string;
};

export type PublicToolFaq = {
  question: string;
  answer: string;
};

export type PublicTool = {
  slug: PublicToolSlug;
  templateSlug: PublicTemplateSlug;
  templateTitle: string;
  category: TemplateCategory;
  requiredPlan: Plan;
  platform: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  eyebrow: string;
  subheading: string;
  supportingCopy: string;
  primaryCtaLabel: string;
  demoIntro: string;
  demoFields: PublicToolDemoField[];
  demoOutputLabel: string;
  demoOutput: string;
  whyStructured: {
    heading: string;
    blankPrompt: string;
    structuredWorkflow: string;
  };
  features: { title: string; description: string }[];
  useCases: { title: string; description: string }[];
  faqs: PublicToolFaq[];
  relatedSlugs: PublicToolSlug[];
};

export const publicToolsIndex = {
  path: PUBLIC_TOOLS_INDEX_PATH,
  h1: "AI Content Templates & Generators",
  metaTitle: "AI Content Templates & Generators",
  metaDescription:
    "Public previews of CreatorNivo’s structured social and video templates. Open a tool page, then sign in to generate an editable draft.",
  ogTitle: "AI Content Templates & Generators | CreatorNivo",
  ogDescription:
    "Browse public LinkedIn, X, Instagram, Facebook, TikTok, YouTube, Reddit, and Threads template pages. Generation stays behind sign-in.",
  intro:
    "Each page shows the real template fields and a static sample draft. Signing in opens the protected Generate workspace for that template.",
} as const;

export const publicTools: PublicTool[] = [
  {
    slug: "linkedin-post-generator",
    templateSlug: "linkedin-post",
    templateTitle: "LinkedIn Post",
    category: "linkedin_post",
    requiredPlan: "free",
    platform: "LinkedIn",
    h1: "AI LinkedIn Post Generator",
    metaTitle: "AI LinkedIn Post Generator",
    metaDescription:
      "Draft a LinkedIn post from guided fields such as subject, tone, goal, and audience. Sign in to generate an editable draft you can review and save.",
    ogTitle: "AI LinkedIn Post Generator | CreatorNivo",
    ogDescription:
      "Use CreatorNivo’s LinkedIn Post template to turn a topic, tone, and goal into a structured draft. Public preview only — generation requires an account.",
    eyebrow: "LinkedIn template",
    subheading:
      "Create structured LinkedIn drafts without starting from a blank prompt.",
    supportingCopy:
      "CreatorNivo asks for the subject, primary goal, audience, and core message before it writes. You review the draft in Generate, then edit or save it. Nothing is posted to LinkedIn.",
    primaryCtaLabel: "Try LinkedIn Post Generator",
    demoIntro:
      "A static preview of the LinkedIn Post template. The real form has more optional fields for format, voice, and facts.",
    demoFields: [
      { key: "subjectOrOffer", value: "Launching a SaaS" },
      { key: "tone", value: "Casual professional" },
      { key: "primaryGoal", value: "Start a discussion" },
      { key: "targetAudience", value: "Solo founders building B2B products" },
      {
        key: "coreMessage",
        value: "The first public version taught us more than another month of polish",
      },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `We launched the first version last Tuesday.

It was thinner than I wanted. Support replies still used a spreadsheet. The pricing page had one plan and a lot of caveats.

What I would not trade: three customers telling us which field they actually fill in, and which one they skip.

If you shipped something unfinished this year, what did users notice first?`,
    whyStructured: {
      heading: "Why a LinkedIn template instead of a blank chat",
      blankPrompt:
        "A blank prompt often produces a generic hook, a list of unearned lessons, and a question that does not match your goal.",
      structuredWorkflow:
        "The LinkedIn Post template keeps one subject, one goal, and an audience in view. Optional fields cover tone, format, facts, and the reader action so the draft stays closer to what you meant to say.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Required fields cover the subject, goal, audience, core message, and facts. Optional groups add tone, format, and constraints.",
      },
      {
        title: "Editable draft",
        description:
          "Generation returns text you can rewrite in the workspace. Review it before you copy or save it.",
      },
      {
        title: "Personal draft library",
        description:
          "Save useful versions and reopen them later. Free accounts have a saved-draft limit; Pro can keep more.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can download a saved draft as .md or .txt. CreatorNivo does not publish to LinkedIn.",
      },
    ],
    useCases: [
      {
        title: "Founder updates",
        description:
          "Ship notes, pricing changes, or product milestones without turning the post into a press release.",
      },
      {
        title: "Product lessons",
        description:
          "One lesson, the facts you can stand behind, and a question that invites replies.",
      },
      {
        title: "Professional insights",
        description:
          "A clear takeaway for a specific role — operators, marketers, or hiring managers — instead of a general pep talk.",
      },
      {
        title: "Discussion posts",
        description:
          "Set the goal to start a discussion and keep the close aligned with that, not a hard sell.",
      },
    ],
    faqs: [
      {
        question: "Is the LinkedIn Post Generator free to try?",
        answer:
          "Yes. LinkedIn Post is a free template. After you create an account and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need to create an account?",
        answer:
          "Yes. This page is a public preview. The real generator stays behind sign-in so usage limits and saved drafts stay attached to your account.",
      },
      {
        question: "Can I edit the generated post?",
        answer:
          "Yes. The output is an editable draft in Generate. Review and change it before you copy or save it.",
      },
      {
        question: "Does CreatorNivo automatically publish to LinkedIn?",
        answer:
          "No. CreatorNivo does not connect to LinkedIn or post for you. You copy the draft and publish it yourself if you choose to.",
      },
      {
        question: "How is this different from using a blank AI chat?",
        answer:
          "The template collects subject, goal, audience, and facts as separate fields. That keeps the draft tied to one professional post instead of a generic essay.",
      },
    ],
    relatedSlugs: [
      "x-thread-generator",
      "threads-post-generator",
      "facebook-post-generator",
    ],
  },
  {
    slug: "x-thread-generator",
    templateSlug: "x-thread",
    templateTitle: "X Thread",
    category: "x_thread",
    requiredPlan: "free",
    platform: "X",
    h1: "AI X Thread Generator",
    metaTitle: "AI X Thread Generator",
    metaDescription:
      "Plan an X thread from topic, goal, audience, and key points. Sign in to generate a numbered draft you can edit and save.",
    ogTitle: "AI X Thread Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s X Thread template. Fill structured fields, then sign in to generate a connected thread draft. No posting to X.",
    eyebrow: "X template",
    subheading:
      "Turn one angle and a short fact list into a numbered thread draft.",
    supportingCopy:
      "The X Thread template asks for the topic and angle, the goal, the audience, and the points you want treated as facts. Generation happens after you sign in. CreatorNivo does not post to X.",
    primaryCtaLabel: "Try X Thread Generator",
    demoIntro:
      "A static preview of the X Thread template. The real form also covers thread type, length, sources, and CTA.",
    demoFields: [
      {
        key: "topicAndAngle",
        value: "Why short product posts convert better than feature dumps",
      },
      { key: "primaryGoal", value: "Educate or explain" },
      {
        key: "targetAudience",
        value: "Indie founders writing about their own products",
      },
      { key: "threadType", value: "Educational breakdown" },
      { key: "tone", value: "Clear and natural" },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `1/ A 12-feature launch post is hard to reply to. A post about one decision is not.

2/ Readers can hold one tradeoff. They cannot hold your whole changelog.

3/ Write the constraint first: what you left out, and why.

4/ Then add the one proof you actually have — a quote, a number, or a screenshot note.

5/ End with a question about their constraint, not a request to “follow for more.”`,
    whyStructured: {
      heading: "Why a thread template instead of a blank chat",
      blankPrompt:
        "A blank “write a Twitter thread” prompt often invents tweets, repeats the hook, and ends with a vague CTA.",
      structuredWorkflow:
        "You supply the angle and the points that may appear. Thread type and length shape pacing so the draft reads as connected posts, not an article split into numbered lines.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Topic and angle, goal, audience, and key points are required. Optional fields cover type, length, tone, and destination links.",
      },
      {
        title: "Editable thread draft",
        description:
          "You get a numbered draft to rewrite. Keep, cut, or reorder posts before you copy them.",
      },
      {
        title: "Personal draft library",
        description:
          "Save threads you want to reuse as a starting point for a later topic.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can export a saved draft as .md or .txt. There is no X integration.",
      },
    ],
    useCases: [
      {
        title: "Educational breakdowns",
        description:
          "Explain one mechanism — pricing, onboarding, or distribution — across a short sequence.",
      },
      {
        title: "Launch threads",
        description:
          "State what shipped, what did not, and who it is for, without a feature dump.",
      },
      {
        title: "Lessons and mistakes",
        description:
          "Keep the story attached to facts you enter. The template is not meant to invent a personal anecdote.",
      },
      {
        title: "Opinion threads",
        description:
          "Set the goal to share an opinion and keep the close aligned with discussion or a single next step.",
      },
    ],
    faqs: [
      {
        question: "Is the X Thread Generator free to try?",
        answer:
          "Yes. X Thread is a free template. After you sign in and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes. This page does not generate posts. Signing in opens /generate with the X Thread template selected.",
      },
      {
        question: "Can I edit the generated thread?",
        answer:
          "Yes. Treat the output as a first draft. Edit it in Generate, then copy the posts you want to publish yourself.",
      },
      {
        question: "Does CreatorNivo post to X?",
        answer:
          "No. There is no X connection and no scheduled posting. You copy the text out of CreatorNivo.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "You separate the angle, the audience, and the facts. That reduces invented stats and keeps the thread on one argument.",
      },
    ],
    relatedSlugs: [
      "linkedin-post-generator",
      "threads-post-generator",
      "reddit-post-generator",
    ],
  },
  {
    slug: "instagram-post-generator",
    templateSlug: "instagram-post",
    templateTitle: "Instagram Post",
    category: "instagram_post",
    requiredPlan: "free",
    platform: "Instagram",
    h1: "AI Instagram Post Generator",
    metaTitle: "AI Instagram Post Generator",
    metaDescription:
      "Draft an Instagram caption from topic, goal, audience, and core message. Sign in to generate an editable feed-post package you can review.",
    ogTitle: "AI Instagram Post Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s Instagram Post template. Structured caption fields, then sign in to generate. CreatorNivo does not post to Instagram.",
    eyebrow: "Instagram template",
    subheading:
      "Write a feed caption from a topic and one takeaway, not a blank box.",
    supportingCopy:
      "The Instagram Post template collects the topic, goal, audience, and core message, then optional caption length, tone, and visual notes. You generate after signing in. CreatorNivo does not publish to Instagram.",
    primaryCtaLabel: "Try Instagram Post Generator",
    demoIntro:
      "A static preview of the Instagram Post template. The real form also covers caption length, proof, hashtags, and visual notes.",
    demoFields: [
      {
        key: "postTopic",
        value: "Honest Early Access update for content teams",
      },
      { key: "primaryGoal", value: "Educate" },
      {
        key: "targetAudience",
        value: "Marketers posting from a personal brand",
      },
      {
        key: "keyMessage",
        value:
          "A first draft is easier to review when the brief is already split into fields",
      },
      { key: "tone", value: "Warm and conversational" },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `We stopped opening a blank chat for weekly product posts.

Topic, who it is for, and the one sentence we want people to remember go in first. The caption is then something we can cut, not something we have to invent.

If you post from a personal account for a small product, what field do you always forget to write down?`,
    whyStructured: {
      heading: "Why an Instagram template instead of a blank chat",
      blankPrompt:
        "A blank caption prompt often reads like an ad, stacks several CTAs, or invents a story you did not provide.",
      structuredWorkflow:
        "You lock the topic and takeaway first. Goal and tone then shape the opening and the close so the caption stays native to a single feed post.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Topic, goal, audience, and message are required. Optional fields cover length, tone, proof, and visual format.",
      },
      {
        title: "Editable caption draft",
        description:
          "Generate returns a caption package you can shorten or rewrite before you copy it.",
      },
      {
        title: "Personal draft library",
        description:
          "Save captions that worked as structure, then reuse the same field pattern next week.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can export saved drafts as .md or .txt. There is no Instagram publishing.",
      },
    ],
    useCases: [
      {
        title: "Product updates",
        description:
          "Say what changed and who it helps, without turning the caption into a landing page.",
      },
      {
        title: "Educational carousels and stills",
        description:
          "Keep one teaching point in the caption. Visual notes stay in the optional fields.",
      },
      {
        title: "Founder notes",
        description:
          "A short story or lesson, limited to facts you enter.",
      },
      {
        title: "Soft promotions",
        description:
          "If the goal is an offer, you still supply the terms. The template should not invent a discount.",
      },
    ],
    faqs: [
      {
        question: "Is the Instagram Post Generator free to try?",
        answer:
          "Yes. Instagram Post is a free template. After you sign in and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes. This page only shows a static preview. The live template opens in Generate after authentication.",
      },
      {
        question: "Can I edit the generated caption?",
        answer:
          "Yes. Edit the draft in the workspace, then copy it into Instagram yourself.",
      },
      {
        question: "Does CreatorNivo post to Instagram?",
        answer:
          "No. There is no Instagram login, scheduling, or auto-publish.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "The template separates topic, audience, and takeaway. That keeps the caption shorter and less likely to invent a personal story.",
      },
    ],
    relatedSlugs: [
      "tiktok-caption-generator",
      "threads-post-generator",
      "facebook-post-generator",
    ],
  },
  {
    slug: "facebook-post-generator",
    templateSlug: "facebook-post",
    templateTitle: "Facebook Post",
    category: "facebook_post",
    requiredPlan: "free",
    platform: "Facebook",
    h1: "AI Facebook Post Generator",
    metaTitle: "AI Facebook Post Generator",
    metaDescription:
      "Draft a Facebook post from subject, post type, goal, and audience. Sign in to generate an editable update you can review and save.",
    ogTitle: "AI Facebook Post Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s Facebook Post template. Structured fields for updates, tips, and discussions. Generation requires sign-in.",
    eyebrow: "Facebook template",
    subheading:
      "Write a Page or profile update from a subject and one goal.",
    supportingCopy:
      "The Facebook Post template asks what the post is about, the post type, the goal, and the audience. Optional fields cover links, offers, and tone. You generate after signing in. CreatorNivo does not post to Facebook.",
    primaryCtaLabel: "Try Facebook Post Generator",
    demoIntro:
      "A static preview of the Facebook Post template. The real form also covers links, proof, length, and restrictions.",
    demoFields: [
      {
        key: "subjectOrOffer",
        value: "Weekly drafting tip for small marketing teams",
      },
      { key: "postType", value: "Educational tip" },
      { key: "primaryGoal", value: "Engagement" },
      {
        key: "targetAudience",
        value: "Owners and marketers at small local businesses",
      },
      {
        key: "keyMessage",
        value:
          "Reuse the same brief fields each week instead of rewriting the request from scratch",
      },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `We keep a short list next to the draft: what happened, who should care, and what we want people to do.

That is enough for a useful Friday update. It is usually too little for a brochure, which is the point.

If you post for a small business, which of those three do you skip when you are in a hurry?`,
    whyStructured: {
      heading: "Why a Facebook template instead of a blank chat",
      blankPrompt:
        "A blank prompt often writes a flyer: stacked benefits, a hard CTA, and no sense of whether this is a tip, an event, or a question.",
      structuredWorkflow:
        "Post type and goal decide the shape first. The subject and audience then keep the update specific to one Page post.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Subject, goal, audience, and message are required. Post type, tone, and link fields are available when you need them.",
      },
      {
        title: "Editable draft",
        description:
          "The result is text to review. Adjust the opening or the question before you copy it.",
      },
      {
        title: "Personal draft library",
        description:
          "Save Page updates you want to reuse as a pattern for the next announcement.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can export saved drafts as .md or .txt. CreatorNivo does not publish to Facebook.",
      },
    ],
    useCases: [
      {
        title: "Community updates",
        description:
          "Hours, events, or process changes written as a note, not a press release.",
      },
      {
        title: "Educational tips",
        description:
          "One practical tip with a question that matches the engagement goal.",
      },
      {
        title: "Event reminders",
        description:
          "Use the event-oriented post type and only include dates you enter.",
      },
      {
        title: "Soft offers",
        description:
          "If you promote something, supply the terms. The template should not invent a sale.",
      },
    ],
    faqs: [
      {
        question: "Is the Facebook Post Generator free to try?",
        answer:
          "Yes. Facebook Post is a free template. After you sign in and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes. The public page is a demo. Authentication opens the protected Facebook Post template.",
      },
      {
        question: "Can I edit the generated post?",
        answer:
          "Yes. Edit the draft in Generate, then copy it into Facebook yourself.",
      },
      {
        question: "Does CreatorNivo publish to Facebook Pages?",
        answer:
          "No. There is no Facebook Page connection and no scheduled posting.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "You choose a post type and a single goal. That stops the draft from mixing a tip, an offer, and an event in one update.",
      },
    ],
    relatedSlugs: [
      "instagram-post-generator",
      "linkedin-post-generator",
      "threads-post-generator",
    ],
  },
  {
    slug: "tiktok-caption-generator",
    templateSlug: "tiktok-caption",
    templateTitle: "TikTok Caption",
    category: "tiktok",
    requiredPlan: "free",
    platform: "TikTok",
    h1: "AI TikTok Caption Generator",
    metaTitle: "AI TikTok Caption Generator",
    metaDescription:
      "Write a TikTok caption from the video topic, format, goal, and key message. Sign in to generate short caption variants you can edit.",
    ogTitle: "AI TikTok Caption Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s TikTok Caption template. Describe the video, then sign in to generate captions. No TikTok publishing.",
    eyebrow: "TikTok template",
    subheading:
      "Write a caption that adds context to the video instead of repeating it.",
    supportingCopy:
      "The TikTok Caption template starts from what happens in the video, then the goal, audience, and key message. Optional fields cover length, hooks, and hashtags. You generate after signing in. CreatorNivo does not post to TikTok.",
    primaryCtaLabel: "Try TikTok Caption Generator",
    demoIntro:
      "A static preview of the TikTok Caption template. The real form also covers video summary, caption length, CTA, and hashtags.",
    demoFields: [
      {
        key: "videoTopic",
        value: "Three mistakes beginners make when writing captions",
      },
      { key: "videoFormat", value: "List / tips" },
      { key: "primaryGoal", value: "Engagement" },
      {
        key: "targetAudience",
        value: "Freelance creators posting product walkthroughs",
      },
      {
        key: "keyMessage",
        value: "The caption should add context, not repeat the voiceover",
      },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `The voiceover already listed the three mistakes.

Caption idea: which one do you still do on product videos — repeating the script, stuffing tags, or asking for a follow with nothing to reply to?

Save this if you write the caption after you edit.`,
    whyStructured: {
      heading: "Why a caption template instead of a blank chat",
      blankPrompt:
        "A blank “write a TikTok caption” prompt often repeats the video, invents a hook, or adds hashtags that do not match the footage.",
      structuredWorkflow:
        "You describe the video first. Goal and message then decide whether the caption should ask a question, add a missing detail, or stay short.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Video topic, summary, goal, audience, and key message are required. Format, length, and CTA are optional.",
      },
      {
        title: "Editable caption variants",
        description:
          "The template can return more than one caption to compare. You still edit before you use one.",
      },
      {
        title: "Personal draft library",
        description:
          "Save caption patterns that fit how you usually shoot — lists, demos, or talking-head clips.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can export saved drafts as .md or .txt. There is no TikTok upload or posting.",
      },
    ],
    useCases: [
      {
        title: "Short captions",
        description:
          "A single line that adds context the voiceover left out.",
      },
      {
        title: "Promotional captions",
        description:
          "If there is an offer, you enter the terms. The draft should not invent a discount or urgency.",
      },
      {
        title: "Creator hooks",
        description:
          "A question or missing detail that belongs next to a list or how-to video.",
      },
      {
        title: "Product walkthroughs",
        description:
          "Name the product and the one thing the viewer should remember after the clip.",
      },
    ],
    faqs: [
      {
        question: "Is the TikTok Caption Generator free to try?",
        answer:
          "Yes. TikTok Caption is a free template. After you sign in and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes. This page is a static demo. Signing in opens the TikTok Caption template in Generate.",
      },
      {
        question: "Can I edit the generated caption?",
        answer:
          "Yes. Pick a variant, edit it, and copy it into TikTok yourself.",
      },
      {
        question: "Does CreatorNivo post to TikTok?",
        answer:
          "No. There is no TikTok login, upload, or auto-caption publish.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "You describe the actual video and one message. That keeps the caption from inventing scenes or repeating the script.",
      },
    ],
    relatedSlugs: [
      "instagram-post-generator",
      "youtube-script-generator",
      "threads-post-generator",
    ],
  },
  {
    slug: "youtube-script-generator",
    templateSlug: "youtube-script",
    templateTitle: "YouTube Script",
    category: "youtube",
    requiredPlan: "pro",
    platform: "YouTube",
    h1: "AI YouTube Script Generator",
    metaTitle: "AI YouTube Script Generator",
    metaDescription:
      "Outline a long-form YouTube script from topic, goal, audience, and format. Sign in to open the Pro template and generate an editable draft.",
    ogTitle: "AI YouTube Script Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s YouTube Script template. Structured fields for hook, sections, and CTA. This is a Pro template — generation requires sign-in.",
    eyebrow: "YouTube template · Pro",
    subheading:
      "Plan a spoken long-form script from a topic, promise, and format.",
    supportingCopy:
      "The YouTube Script template is built for standard or long-form videos, not Shorts. It asks for the topic, goal, audience, viewer promise, and format. YouTube Script is a Pro template. After you sign in, it opens if your plan includes Pro templates. CreatorNivo does not upload to YouTube.",
    primaryCtaLabel: "Try YouTube Script Generator",
    demoIntro:
      "A static preview of the YouTube Script template. The real form also covers duration, structure, visuals, and discovery fields.",
    demoFields: [
      {
        key: "videoTopic",
        value: "How to outline a 10-minute product explainer",
      },
      { key: "primaryGoal", value: "Educate or explain" },
      {
        key: "targetAudience",
        value: "First-time founders building small SaaS products",
      },
      { key: "videoFormat", value: "Tutorial or how-to" },
      { key: "toneStyle", value: "Clear and natural" },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `[HOOK]
If your explainer keeps turning into a feature tour, start with the viewer’s job, not your menu.

[SETUP]
Promise: by the end they can outline a 10-minute video in four blocks — problem, demo, caveat, next step.

[BODY]
1. Write the job the viewer is trying to finish.
2. Show only the path that finishes that job.
3. Say what the product does not do yet.

[CLOSE]
Ask them which block they usually skip when they record.`,
    whyStructured: {
      heading: "Why a script template instead of a blank chat",
      blankPrompt:
        "A blank “write a YouTube script” prompt often returns an article with timestamps, or invents stories and proof.",
      structuredWorkflow:
        "You lock the topic, promise, and format first. Duration, tone, and essential facts then keep the spoken draft usable for recording, not just reading.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Topic, goal, audience, promise, facts, format, and language are required. Optional groups cover structure, production, and discovery.",
      },
      {
        title: "Editable spoken draft",
        description:
          "The output is a script package to review. Cut sections or change the close before you record.",
      },
      {
        title: "Personal draft library",
        description:
          "Save outlines you want to reuse when the next video uses the same format.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro includes export to .md and .txt. CreatorNivo does not upload videos or schedule YouTube posts.",
      },
    ],
    useCases: [
      {
        title: "Product explainers",
        description:
          "One viewer job, a short demo path, and an honest caveat.",
      },
      {
        title: "Tutorials",
        description:
          "Step order comes from the facts you enter, not from invented instructions.",
      },
      {
        title: "Founder commentary",
        description:
          "An opinion format with a stated promise, so the video does not wander.",
      },
      {
        title: "Review or comparison",
        description:
          "Only compare points you supply. The template should not invent benchmarks.",
      },
    ],
    faqs: [
      {
        question: "Is the YouTube Script Generator free to try?",
        answer:
          "YouTube Script is a Pro template. You can open this preview without an account. Generating a draft requires sign-in and a plan that includes Pro templates.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes, to generate. After authentication you land on Generate with the YouTube Script template selected. Free accounts will see it as a Pro template.",
      },
      {
        question: "Can I edit the generated script?",
        answer:
          "Yes. The result is an editable draft. Review it before you record or publish anything.",
      },
      {
        question: "Does CreatorNivo upload to YouTube?",
        answer:
          "No. There is no YouTube account connection, no thumbnail upload, and no scheduling.",
      },
      {
        question: "Does this write YouTube Shorts?",
        answer:
          "No. This template is for standard or long-form videos. Short-form work uses other templates, such as TikTok Caption or Short-Form Video Script inside the app.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "You set the promise, format, and facts before any draft is written. That keeps the script closer to a recording outline than a blog post.",
      },
    ],
    relatedSlugs: [
      "tiktok-caption-generator",
      "linkedin-post-generator",
      "x-thread-generator",
    ],
  },
  {
    slug: "reddit-post-generator",
    templateSlug: "reddit-post",
    templateTitle: "Reddit Post",
    category: "reddit",
    requiredPlan: "free",
    platform: "Reddit",
    h1: "AI Reddit Post Generator",
    metaTitle: "AI Reddit Post Generator",
    metaDescription:
      "Draft a Reddit post from the situation, goal, subreddit, and facts. Sign in to generate a community-first draft you can review before posting.",
    ogTitle: "AI Reddit Post Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s Reddit Post template. Structured fields for subreddit, goal, and context. No Reddit publishing.",
    eyebrow: "Reddit template",
    subheading:
      "Write a subreddit-appropriate post from the situation and the facts you can stand behind.",
    supportingCopy:
      "The Reddit Post template asks for the topic or situation, the goal, the target subreddit, the intended readers, and the facts. It is meant for an honest community post, not disguised advertising. You generate after signing in. CreatorNivo does not post to Reddit.",
    primaryCtaLabel: "Try Reddit Post Generator",
    demoIntro:
      "A static preview of the Reddit Post template. The real form also covers rules, flair, length, and promotion disclosure.",
    demoFields: [
      {
        key: "topicOrSituation",
        value:
          "I switched from a blank chatbot prompt to structured template fields for weekly product posts",
      },
      { key: "primaryGoal", value: "Share an experience" },
      { key: "targetSubreddit", value: "r/SaaS" },
      {
        key: "intendedReaders",
        value: "Indie developers who have launched a SaaS product",
      },
      { key: "tone", value: "Natural and candid" },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `Title: Switched our weekly product posts from a blank prompt to a 5-field brief

I used to paste “write a launch post” into a chat and then spend longer editing out the invented metrics.

Now I write the situation, who it is for, and the facts that may appear. The draft is still messy. It is just messy in the right places.

Not posting this as a recommendation for a tool war — curious how other small SaaS teams capture the brief before they draft.`,
    whyStructured: {
      heading: "Why a Reddit template instead of a blank chat",
      blankPrompt:
        "A blank prompt often sounds like marketing, invents a personal crisis, or ignores the subreddit you named.",
      structuredWorkflow:
        "You name the community, the goal, and the facts first. Promotion and disclosure fields exist so affiliation is stated when it should be, not hidden.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Situation, goal, subreddit, readers, and facts are required. Optional fields cover rules, flair, and affiliation.",
      },
      {
        title: "Editable community draft",
        description:
          "You still rewrite the post in your own voice. The template is a starting structure, not a finished submission.",
      },
      {
        title: "Personal draft library",
        description:
          "Save versions you want to adapt for a different subreddit later.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can export saved drafts as .md or .txt. CreatorNivo does not submit to Reddit.",
      },
    ],
    useCases: [
      {
        title: "Ask for advice",
        description:
          "State the situation and the decision you need help with. Do not invent a backstory.",
      },
      {
        title: "Share an experience",
        description:
          "A build or process note limited to what actually happened.",
      },
      {
        title: "Request feedback",
        description:
          "Name the artifact and the kind of feedback you want from that community.",
      },
      {
        title: "Project updates",
        description:
          "What changed, what is still broken, and why you are posting in that subreddit.",
      },
    ],
    faqs: [
      {
        question: "Is the Reddit Post Generator free to try?",
        answer:
          "Yes. Reddit Post is a free template. After you sign in and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes. This page does not generate posts. Signing in opens the Reddit Post template in Generate.",
      },
      {
        question: "Can I edit the generated post?",
        answer:
          "Yes. Reddit readers notice canned copy. Edit the draft so it sounds like you before you submit it.",
      },
      {
        question: "Does CreatorNivo post to Reddit?",
        answer:
          "No. There is no Reddit account connection and no auto-submit.",
      },
      {
        question: "Will this write promotional spam?",
        answer:
          "The template is built for a community-first post. If you have an affiliation or a link, use the disclosure fields. Do not treat this as a growth hack.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "You specify the subreddit, the goal, and the facts. That is closer to how a real post is judged than a generic “write a Reddit post” prompt.",
      },
    ],
    relatedSlugs: [
      "x-thread-generator",
      "linkedin-post-generator",
      "facebook-post-generator",
    ],
  },
  {
    slug: "threads-post-generator",
    templateSlug: "threads-post",
    templateTitle: "Threads Post",
    category: "threads_post",
    requiredPlan: "free",
    platform: "Threads",
    h1: "AI Threads Post Generator",
    metaTitle: "AI Threads Post Generator",
    metaDescription:
      "Draft a Threads post from topic, goal, audience, and core message. Sign in to generate a short conversational draft you can edit and save.",
    ogTitle: "AI Threads Post Generator | CreatorNivo",
    ogDescription:
      "Preview CreatorNivo’s Threads Post template. Structured fields for a concise post or short sequence. No Threads publishing.",
    eyebrow: "Threads template",
    subheading:
      "Write a short Threads draft from one topic and one goal.",
    supportingCopy:
      "The Threads Post template asks for the topic, goal, audience, and core message. Optional fields cover format, tone, and whether you want a short sequence. You generate after signing in. CreatorNivo does not post to Threads.",
    primaryCtaLabel: "Try Threads Post Generator",
    demoIntro:
      "A static preview of the Threads Post template. The real form also covers format, opening style, and reply prompts.",
    demoFields: [
      {
        key: "topic",
        value: "What we learned after simplifying our onboarding flow",
      },
      { key: "goal", value: "Start a conversation" },
      {
        key: "audience",
        value: "Solo founders building their first content workflow",
      },
      {
        key: "keyMessage",
        value:
          "Consistency is easier when the workflow is smaller and repeatable",
      },
      { key: "tone", value: "Clear and conversational" },
    ],
    demoOutputLabel: "Example draft",
    demoOutput: `We cut onboarding from seven screens to three.

Support questions dropped. Completion did not magically double. It just became obvious which remaining field people still stall on.

If you simplified a flow this year, which step turned out to be the real one?`,
    whyStructured: {
      heading: "Why a Threads template instead of a blank chat",
      blankPrompt:
        "A blank prompt often pastes a LinkedIn post or an X hook into a shorter box and calls it done.",
      structuredWorkflow:
        "Topic, goal, and message stay short on purpose. Format and tone then decide whether this is one post or a small sequence.",
    },
    features: [
      {
        title: "Guided inputs",
        description:
          "Topic, goal, audience, and core message are required. Optional fields cover format, tone, and reply prompts.",
      },
      {
        title: "Editable short draft",
        description:
          "The result is a concise post you can tighten further before you copy it.",
      },
      {
        title: "Personal draft library",
        description:
          "Save posts that started useful conversations and reuse the field pattern.",
      },
      {
        title: "Export on Pro",
        description:
          "Pro accounts can export saved drafts as .md or .txt. There is no Threads integration.",
      },
    ],
    useCases: [
      {
        title: "Launch observations",
        description:
          "One specific thing you noticed after a change, not a full recap.",
      },
      {
        title: "Conversation starters",
        description:
          "Set the goal to start a conversation and end with a question people can answer.",
      },
      {
        title: "Short product notes",
        description:
          "A single update with the audience named, so the post does not sound like a broadcast.",
      },
      {
        title: "Lessons",
        description:
          "One lesson and the fact that supports it. Leave the rest out.",
      },
    ],
    faqs: [
      {
        question: "Is the Threads Post Generator free to try?",
        answer:
          "Yes. Threads Post is a free template. After you sign in and confirm your email, free accounts can generate a limited number of drafts per day.",
      },
      {
        question: "Do I need an account?",
        answer:
          "Yes. This page is a preview. Signing in opens Generate with the Threads Post template selected.",
      },
      {
        question: "Can I edit the generated post?",
        answer:
          "Yes. Short posts still need a pass in your own voice. Edit the draft, then copy it.",
      },
      {
        question: "Does CreatorNivo post to Threads?",
        answer:
          "No. There is no Threads account connection and no auto-publish.",
      },
      {
        question: "How is this different from a blank AI chat?",
        answer:
          "You keep one topic and one goal. That is closer to how Threads is read than pasting a longer social post into the box.",
      },
    ],
    relatedSlugs: [
      "instagram-post-generator",
      "x-thread-generator",
      "linkedin-post-generator",
    ],
  },
];

export const publicToolHowItWorks = [
  {
    step: "01",
    title: "Choose the template",
    description:
      "Open the public tool page, then continue to the matching template in Generate after you sign in.",
  },
  {
    step: "02",
    title: "Fill structured fields",
    description:
      "Enter the topic, audience, goal, and facts the draft is allowed to use. Optional groups stay collapsed until you need them.",
  },
  {
    step: "03",
    title: "Generate an editable draft",
    description:
      "Actual generation runs only after authentication and email confirmation. This public page never calls the AI API.",
  },
  {
    step: "04",
    title: "Review, save, and export",
    description:
      "Edit the draft, save it to your library, and export .md or .txt on Pro. Publishing to the social network stays manual.",
  },
] as const;

export function listPublicTools(): PublicTool[] {
  return publicTools;
}

export function getPublicToolBySlug(slug: string): PublicTool | null {
  return publicTools.find((tool) => tool.slug === slug) ?? null;
}

export function getPublicToolByTemplateSlug(
  templateSlug: string,
): PublicTool | null {
  return (
    publicTools.find((tool) => tool.templateSlug === templateSlug) ?? null
  );
}

export function listPublicToolPagePaths(): string[] {
  return publicTools.map((tool) => `/tools/${tool.slug}`);
}

export function listPublicToolSitemapPaths(): string[] {
  return [PUBLIC_TOOLS_INDEX_PATH, ...listPublicToolPagePaths()];
}

export function getRelatedPublicTools(tool: PublicTool): PublicTool[] {
  return tool.relatedSlugs
    .map((slug) => getPublicToolBySlug(slug))
    .filter((item): item is PublicTool => item !== null);
}
