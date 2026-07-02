import { PrismaClient, Plan, TemplateCategory } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    slug: "x-thread",
    title: "X Thread",
    description:
      "A scroll-stopping tweet thread with a sharp hook, numbered tweets, and a clear CTA",
    category: TemplateCategory.x_thread,
    prompt:
      'Write an X thread of {{tweetCount}} tweets about "{{topic}}". Tone: {{tone}}. Target audience: {{audience}}. Rules: tweet 1 is a bold hook that stops the scroll; each tweet is self-contained and under 280 characters; use line breaks for readability; the final tweet is a CTA. Number every tweet.',
    variables: [
      {
        key: "topic",
        label: "Topic",
        placeholder: "5 content marketing mistakes killing your reach",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "expert but approachable",
        required: true,
      },
      {
        key: "audience",
        label: "Audience",
        placeholder: "marketers and solo founders",
        required: true,
      },
      {
        key: "tweetCount",
        label: "Number of tweets",
        placeholder: "7",
        required: false,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "linkedin-post",
    title: "LinkedIn Post",
    description:
      "Professional LinkedIn post with a strong hook, story arc, and engagement question",
    category: TemplateCategory.linkedin_post,
    prompt:
      'Write a LinkedIn post about "{{topic}}". Tone: {{tone}}. Goal: {{goal}}. Structure: hook in the first 2 lines (use a line break after the hook), 3-5 short paragraphs with one insight per paragraph, end with an open question to spark comments. Max 1,300 characters. No hashtag spam.',
    variables: [
      {
        key: "topic",
        label: "Topic",
        placeholder: "Lessons from year one of building a SaaS",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "professional, personal, founder-to-founder",
        required: true,
      },
      {
        key: "goal",
        label: "Goal",
        placeholder: "spark discussion and profile visits",
        required: true,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "instagram-post",
    title: "Instagram Post",
    description:
      "Caption with a scroll-stopping opener, value-packed body, and strategic hashtags",
    category: TemplateCategory.instagram_post,
    prompt:
      'Write an Instagram caption for a post about "{{topic}}". Tone: {{tone}}. Audience: {{audience}}. Structure: punchy first line (shown before "more"), 2-3 short paragraphs with emojis used sparingly, clear CTA, then 5-8 relevant hashtags on a separate line.',
    variables: [
      {
        key: "topic",
        label: "Topic",
        placeholder: "Behind the scenes of our product launch",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "friendly, authentic",
        required: true,
      },
      {
        key: "audience",
        label: "Audience",
        placeholder: "creators and entrepreneurs aged 25-40",
        required: true,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "newsletter",
    title: "Newsletter",
    description:
      "Email newsletter with a compelling subject line, value blocks, and a single clear CTA",
    category: TemplateCategory.newsletter,
    prompt:
      'Write a newsletter email about "{{topic}}" for {{brand}}. Goal: {{goal}}. Tone: {{tone}}. Include: subject line (under 50 chars), preview text (under 90 chars), greeting, 2-3 value sections with subheadings, one primary CTA button label, and a brief sign-off.',
    variables: [
      {
        key: "topic",
        label: "Newsletter topic",
        placeholder: "3 AI workflows that cut content time in half",
        required: true,
      },
      {
        key: "brand",
        label: "Brand",
        placeholder: "Creatornivo",
        required: true,
      },
      {
        key: "goal",
        label: "Goal",
        placeholder: "drive webinar signups",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "friendly, expert, conversational",
        required: true,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "cold-email-outreach",
    title: "Cold Email Outreach",
    description:
      "Short, personalized cold email designed to earn a reply — not a delete",
    category: TemplateCategory.email,
    prompt:
      'Write a cold outreach email to a {{recipientRole}}. My offer: {{yourOffer}}. Their likely pain point: {{painPoint}}. Tone: {{tone}}. Rules: under 120 words, no generic opener, one specific observation about their role, one clear value prop, one low-friction CTA (e.g. "worth a 15-min chat?"). Include subject line.',
    variables: [
      {
        key: "recipientRole",
        label: "Recipient role",
        placeholder: "Head of Marketing at a B2B SaaS startup",
        required: true,
      },
      {
        key: "yourOffer",
        label: "Your offer",
        placeholder: "AI-powered content workflow audit",
        required: true,
      },
      {
        key: "painPoint",
        label: "Pain point",
        placeholder: "publishing consistently with a two-person team",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "warm, direct, no fluff",
        required: true,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "blog-article",
    title: "Blog Article",
    description:
      "Long-form SEO article with H1/H2 structure, natural keyword placement, and a strong CTA",
    category: TemplateCategory.blog,
    prompt:
      'Write an SEO blog article about "{{topic}}". Primary keywords: {{keywords}}. Target length: {{length}} words. Structure: H1 title, engaging introduction, 4-5 H2 sections with actionable advice, FAQ section with 3 questions, conclusion with CTA. Write for humans first, search engines second.',
    variables: [
      {
        key: "topic",
        label: "Topic",
        placeholder: "How to build a content system as a solo founder",
        required: true,
      },
      {
        key: "keywords",
        label: "Keywords",
        placeholder: "content system, solo founder, content marketing",
        required: true,
      },
      {
        key: "length",
        label: "Length (words)",
        placeholder: "1500",
        required: false,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "seo-meta-tags",
    title: "SEO Meta Tags",
    description:
      "Click-worthy title tag and meta description tuned for search intent",
    category: TemplateCategory.seo,
    prompt:
      'Write SEO meta tags for a page about "{{topic}}". Primary keyword: {{keyword}}. Brand: {{brand}}. Search intent: {{intent}}. Output: title tag (max 60 characters), meta description (max 155 characters), and 3 alternate title options. Make them compelling for clicks while staying accurate — no clickbait.',
    variables: [
      {
        key: "topic",
        label: "Page topic",
        placeholder: "AI content tools for marketers",
        required: true,
      },
      {
        key: "keyword",
        label: "Primary keyword",
        placeholder: "AI content tools",
        required: true,
      },
      {
        key: "brand",
        label: "Brand",
        placeholder: "Creatornivo",
        required: true,
      },
      {
        key: "intent",
        label: "Search intent",
        placeholder: "informational — comparing tools",
        required: true,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "faq-page",
    title: "FAQ Page",
    description:
      "Customer-focused FAQ section that handles objections and boosts SEO",
    category: TemplateCategory.seo,
    prompt:
      'Write an FAQ section for {{productName}}, a {{productType}}. Target audience: {{audience}}. Include 8-10 Q&A pairs covering: what it is, how it works, pricing, getting started, common objections, and support. Each answer is 2-4 sentences, clear and reassuring. Use natural language people actually search for.',
    variables: [
      {
        key: "productName",
        label: "Product name",
        placeholder: "Creatornivo",
        required: true,
      },
      {
        key: "productType",
        label: "Product type",
        placeholder: "AI content generation platform",
        required: true,
      },
      {
        key: "audience",
        label: "Target audience",
        placeholder: "content creators and marketers",
        required: true,
      },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "youtube-script",
    title: "YouTube Script",
    description:
      "Full YouTube video script with hook, timed sections, B-roll cues, and outro CTA",
    category: TemplateCategory.youtube,
    prompt:
      'Write a YouTube video script about "{{topic}}". Target duration: {{duration}} minutes. Tone: {{tone}}. Structure: [HOOK] first 30 seconds with pattern interrupt, [INTRO] channel welcome + video promise, [MAIN] 3-4 sections with timestamps and [B-ROLL] cues, [OUTRO] recap + subscribe CTA. Write spoken dialogue, not bullet points.',
    variables: [
      {
        key: "topic",
        label: "Video topic",
        placeholder: "5 AI tools every content creator needs in 2026",
        required: true,
      },
      {
        key: "duration",
        label: "Duration (min)",
        placeholder: "10",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "energetic, informative, conversational",
        required: true,
      },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "short-form-video",
    title: "Short-Form Video Script",
    description:
      "Hook-first script for TikTok, Reels, or YouTube Shorts under 60 seconds",
    category: TemplateCategory.youtube,
    prompt:
      'Write a short-form video script ({{duration}} seconds) for {{platform}} about "{{topic}}". Tone: {{tone}}. Structure: [0-3s] visual + verbal hook that creates curiosity, [3-45s] one core insight delivered fast with jump-cut cues, [45-60s] punchy CTA. Include on-screen text suggestions in brackets.',
    variables: [
      {
        key: "topic",
        label: "Topic",
        placeholder: "The one mistake killing your LinkedIn reach",
        required: true,
      },
      {
        key: "platform",
        label: "Platform",
        placeholder: "TikTok / Instagram Reels",
        required: true,
      },
      {
        key: "duration",
        label: "Duration (seconds)",
        placeholder: "45",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "bold, fast-paced, slightly provocative",
        required: true,
      },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "product-description",
    title: "Product Description",
    description:
      "Conversion-focused product page copy with headline, benefits, and CTA",
    category: TemplateCategory.product,
    prompt:
      'Write a product page description for "{{productName}}". Key benefits: {{benefits}}. Target buyer: {{buyer}}. Structure: headline (under 10 words), subheadline, 3 benefit bullets with icons suggested, 2-paragraph description, social proof placeholder, and CTA button text. Focus on outcomes, not features.',
    variables: [
      {
        key: "productName",
        label: "Product name",
        placeholder: "Creatornivo Pro",
        required: true,
      },
      {
        key: "benefits",
        label: "Key benefits",
        placeholder: "unlimited generations, all templates, export to .md",
        required: true,
      },
      {
        key: "buyer",
        label: "Target buyer",
        placeholder: "content creators publishing weekly",
        required: true,
      },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "landing-page-copy",
    title: "Landing Page Copy",
    description:
      "High-converting landing page with hero, benefits, social proof, and CTA sections",
    category: TemplateCategory.marketing,
    prompt:
      'Write landing page copy for "{{productName}}" — {{productTagline}}. Target audience: {{audience}}. Main pain point: {{painPoint}}. Sections: Hero (headline + subheadline + CTA), Problem (3 pain bullets), Solution (3 benefit blocks with headings), How it works (3 steps), Social proof placeholder, Final CTA. Tone: {{tone}}.',
    variables: [
      {
        key: "productName",
        label: "Product name",
        placeholder: "Creatornivo",
        required: true,
      },
      {
        key: "productTagline",
        label: "Tagline",
        placeholder: "Ship content 10x faster with proven AI prompts",
        required: true,
      },
      {
        key: "audience",
        label: "Target audience",
        placeholder: "solo founders and content marketers",
        required: true,
      },
      {
        key: "painPoint",
        label: "Main pain point",
        placeholder: "staring at blank pages and inconsistent publishing",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "confident, clear, benefit-driven",
        required: true,
      },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "paid-ad-copy",
    title: "Paid Ad Copy",
    description:
      "Multiple ad variants for Facebook, Instagram, or Google with hooks and CTAs",
    category: TemplateCategory.marketing,
    prompt:
      'Write 3 paid ad variants for {{platform}} promoting "{{offer}}". Target audience: {{audience}}. Goal: {{goal}}. For each variant provide: headline (under 40 chars), primary text (under 125 words), CTA button label, and one visual concept suggestion. Vary the angle: pain-point, social proof, and urgency.',
    variables: [
      {
        key: "offer",
        label: "Offer",
        placeholder: "Free trial of Creatornivo Pro",
        required: true,
      },
      {
        key: "platform",
        label: "Platform",
        placeholder: "Facebook / Instagram",
        required: true,
      },
      {
        key: "audience",
        label: "Target audience",
        placeholder: "content creators aged 25-45",
        required: true,
      },
      {
        key: "goal",
        label: "Campaign goal",
        placeholder: "signups for free trial",
        required: true,
      },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "case-study",
    title: "Case Study",
    description:
      "Customer success story with challenge, solution, results, and pull quotes",
    category: TemplateCategory.marketing,
    prompt:
      'Write a case study for {{clientName}} ({{clientIndustry}}) who used {{productName}} to achieve {{result}}. Challenge: {{challenge}}. Structure: headline, executive summary (3 sentences), The Challenge, The Solution, The Results (with 3 metric bullets), customer quote placeholder, and CTA. Tone: {{tone}}.',
    variables: [
      {
        key: "clientName",
        label: "Client name",
        placeholder: "Acme Growth Co.",
        required: true,
      },
      {
        key: "clientIndustry",
        label: "Client industry",
        placeholder: "B2B SaaS marketing agency",
        required: true,
      },
      {
        key: "productName",
        label: "Product used",
        placeholder: "Creatornivo",
        required: true,
      },
      {
        key: "challenge",
        label: "Challenge",
        placeholder: "scaling content output without hiring",
        required: true,
      },
      {
        key: "result",
        label: "Key result",
        placeholder: "3x content output in 60 days",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "professional, data-driven",
        required: true,
      },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "linkedin-carousel",
    title: "LinkedIn Carousel",
    description:
      "Slide-by-slide copy for a swipe-worthy LinkedIn carousel post",
    category: TemplateCategory.linkedin_post,
    prompt:
      'Write a LinkedIn carousel of {{slideCount}} slides about "{{topic}}". Tone: {{tone}}. Audience: {{audience}}. Slide 1: bold hook (under 15 words). Slides 2-{{slideCount}}: one insight per slide, max 30 words each, with a suggested visual/icon. Final slide: summary + CTA. Also write the post caption (under 300 chars) that teases the carousel.',
    variables: [
      {
        key: "topic",
        label: "Topic",
        placeholder: "7 habits of high-output creators",
        required: true,
      },
      {
        key: "tone",
        label: "Tone",
        placeholder: "insightful, punchy",
        required: true,
      },
      {
        key: "audience",
        label: "Audience",
        placeholder: "founders and marketers on LinkedIn",
        required: true,
      },
      {
        key: "slideCount",
        label: "Number of slides",
        placeholder: "8",
        required: false,
      },
    ],
    requiredPlan: Plan.pro,
  },
];

async function main() {
  console.log("Seeding templates...");

  for (const template of templates) {
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
  }

  console.log(`Seeded ${templates.length} templates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });