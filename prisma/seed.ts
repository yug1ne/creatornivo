import { PrismaClient, Plan, TemplateCategory } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    slug: "x-thread",
    title: "X Thread",
    description: "Create a tweet thread for X (Twitter) with a hook and CTA",
    category: TemplateCategory.x_thread,
    prompt:
      "Write an X Thread of {{tweetCount}} tweets about \"{{topic}}\". Tone: {{tone}}. Target audience: {{audience}}. The first tweet is a compelling hook. The last one is a CTA. Each tweet up to 280 characters. Number the tweets.",
    variables: [
      { key: "topic", label: "Topic", placeholder: "5 content marketing mistakes", required: true },
      { key: "tone", label: "Tone", placeholder: "expert but approachable", required: true },
      { key: "audience", label: "Audience", placeholder: "marketers and founders", required: true },
      { key: "tweetCount", label: "Number of tweets", placeholder: "7", required: false },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "linkedin-post",
    title: "LinkedIn Post",
    description: "Professional LinkedIn post with a story or insight",
    category: TemplateCategory.linkedin_post,
    prompt:
      "Write a LinkedIn post about \"{{topic}}\". Tone: {{tone}}. Goal: {{goal}}. Structure: hook in the first 2 lines, main idea, conclusion with a question for the audience. Up to 1300 characters.",
    variables: [
      { key: "topic", label: "Topic", placeholder: "Lessons from year one of a startup", required: true },
      { key: "tone", label: "Tone", placeholder: "professional, personal", required: true },
      { key: "goal", label: "Goal", placeholder: "spark discussion", required: true },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "newsletter",
    title: "Newsletter",
    description: "Email newsletter with value, structure, and a call to action",
    category: TemplateCategory.newsletter,
    prompt:
      "Write a newsletter about \"{{topic}}\". Product/brand: {{brand}}. Goal: {{goal}}. Include: subject line, greeting, 2-3 value blocks, CTA button. Tone: {{tone}}.",
    variables: [
      { key: "topic", label: "Newsletter topic", placeholder: "AI trends in 2026", required: true },
      { key: "brand", label: "Brand", placeholder: "Creatornivo", required: true },
      { key: "goal", label: "Goal", placeholder: "drive webinar signups", required: true },
      { key: "tone", label: "Tone", placeholder: "friendly, expert", required: true },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "instagram-post",
    title: "Instagram Post",
    description: "Engaging Instagram post with hashtags",
    category: TemplateCategory.instagram_post,
    prompt:
      "Write an Instagram post about \"{{topic}}\". Tone: {{tone}}. Audience: {{audience}}. Add emojis, 5-7 hashtags, and a call to action.",
    variables: [
      { key: "topic", label: "Topic", placeholder: "Launching a new product", required: true },
      { key: "tone", label: "Tone", placeholder: "friendly", required: true },
      { key: "audience", label: "Audience", placeholder: "creators aged 20-35", required: true },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "blog-article",
    title: "Blog Article",
    description: "SEO article with headings, structure, and keywords",
    category: TemplateCategory.blog,
    prompt:
      "Write an SEO article about \"{{topic}}\". Keywords: {{keywords}}. Length: {{length}} words. Structure: H1, introduction, 3-5 sections with H2, conclusion with CTA.",
    variables: [
      { key: "topic", label: "Topic", placeholder: "How to start freelancing", required: true },
      { key: "keywords", label: "Keywords", placeholder: "freelance, remote work", required: true },
      { key: "length", label: "Length (words)", placeholder: "1200", required: false },
    ],
    requiredPlan: Plan.free,
  },
  {
    slug: "product-description",
    title: "Product Description",
    description: "Sales-focused product or service description",
    category: TemplateCategory.product,
    prompt:
      "Write a sales description for \"{{productName}}\". Benefits: {{benefits}}. Buyer: {{buyer}}. Format: headline, 3 bullet points, description, CTA.",
    variables: [
      { key: "productName", label: "Product name", required: true },
      { key: "benefits", label: "Benefits", placeholder: "time savings, AI generation", required: true },
      { key: "buyer", label: "Target buyer", placeholder: "content creators", required: true },
    ],
    requiredPlan: Plan.pro,
  },
  {
    slug: "youtube-script",
    title: "YouTube Script",
    description: "YouTube video script with hook, main sections, and outro",
    category: TemplateCategory.youtube,
    prompt:
      "Write a YouTube video script about \"{{topic}}\". Duration: {{duration}} minutes. Tone: {{tone}}. Include: hook (first 30 sec), main sections with timestamps, outro with subscribe CTA.",
    variables: [
      { key: "topic", label: "Video topic", placeholder: "AI tools review for creators", required: true },
      { key: "duration", label: "Duration (min)", placeholder: "10", required: true },
      { key: "tone", label: "Tone", placeholder: "energetic, informative", required: true },
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