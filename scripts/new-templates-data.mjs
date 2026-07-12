/**
 * New platform templates (queues 1–3).
 * Improved prompts for select templates live in prisma/template-prompts/*.txt
 * and are loaded at catalog generation time.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.join(__dirname, "..", "prisma", "template-prompts");

function loadPrompt(slug) {
  const filePath = path.join(promptsDir, `${slug}.txt`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing improved prompt file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8").trim();
}

/**
 * @param {{ t: Function, v: Function }} helpers
 */
export function getNewTemplates({ t, v }) {
  return [
    // ——— Improved prompts (prisma/template-prompts/*.txt) ———
    t({
      slug: "facebook-post",
      title: "Facebook Post",
      description:
        "Generate conversational Facebook posts with goal-driven messaging, optional link guidance, disclosure handling, variants, and a visual concept.",
      category: "facebook_post",
      requiredPlan: "free",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("topic", "Topic", true, "Product update or community story"),
        v("postType", "Post type", true, "educational post"),
        v("audience", "Audience", true, "local customers / online community"),
        v("tone", "Tone", true, "friendly, conversational"),
        v("language", "Language", true, "English"),
      ],
      prompt: loadPrompt("facebook-post"),
    }),

    t({
      slug: "threads-post",
      title: "Threads Post",
      description:
        "Create concise, conversational Threads posts or short connected sequences that sound natural, encourage genuine replies, and stay claim-safe.",
      category: "threads_post",
      requiredPlan: "free",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("topic", "Topic or subject", true, "A useful take on content workflows"),
        v("goal", "Primary goal", true, "Start a conversation"),
        v("audience", "Target audience", true, "creators and indie builders"),
        v("keyMessage", "Core message", true, "One insight"),
        v("language", "Output language", true, "English"),
      ],
      prompt: loadPrompt("threads-post"),
    }),

    t({
      slug: "instagram-carousel",
      title: "Instagram Carousel",
      description:
        "Creates a structured Instagram carousel with slide cogs, and accessible alt text.",
      category: "instagram_post",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("carouselTopic", "Topic, product, or idea", true, "7 habits of consistent creators"),
        v("primaryGoal", "Primary goal", true, "Educate or explain"),
        v("targetAudience", "Target audience", true, "creators aged 25-40"),
        v("keyMessage", "Main takeaway", true, "Consistency beats intensity"),
        v("essentialPoints", "Points that must appear", true, "Verified points only"),
        v("outputLanguage", "Output language", true, "English"),
      ],
      prompt: loadPrompt("instagram-carousel"),
    }),

    t({
      slug: "pinterest-pin",
      title: "Pinterest Pin",
      description:
        "Generate search-aware Pinterest titles, descriptions, image-overlay copy, visual direction, and destination-aligned Pin variants.",
      category: "pinterest",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("pinSubject", "Pin topic or offer", true, "Beginner balcony garden checklist"),
        v("primaryGoal", "Primary goal", true, "Increase saves"),
        v("targetAudience", "Target audience", true, "First-time apartment renters"),
        v("keyMessage", "Key message and facts", true, "A small balcony can support a simple herb garden."),
        v("outputLanguage", "Output language", true, "English"),
      ],
      prompt: loadPrompt("pinterest-pin"),
    }),

    t({
      slug: "reddit-post",
      title: "Reddit Post",
      description:
        "Create an honest, subreddit-appropriate post that provides genuine di community rules responsibly.",
      category: "reddit",
      requiredPlan: "free",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("topicOrSituation", "Topic or situation", true, "A founder asking for feedback on a content workflow"),
        v("primaryGoal", "Primary goal", true, "Request feedback"),
        v("targetSubreddit", "Target subreddit", true, "r/Entrepreneur"),
        v("intendedReaders", "Intended readers", true, "solo founders building content systems"),
        v("keyFactsAndContext", "Key facts and context", true, "Only verified context and constraints"),
      ],
      prompt: loadPrompt("reddit-post"),
    }),

    t({
      slug: "google-business-profile-post",
      title: "Google Business Profile Post",
      description:
        "Creates a concise local update, offer, or event post with one CTA, structured details, local relevance, and claim-safe wording for Search and Maps.",
      category: "google_business",
      requiredPlan: "free",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("businessName", "Business name", true, "Green Street Dental"),
        v("postType", "Post type", true, "Update"),
        v("primaryGoal", "Primary goal", true, "Announce an update"),
        v("keyMessage", "Key message and facts", true, "Verified local update details"),
        v("campaignTitle", "Offer or event title", true, "Summer checkup special"),
        v("timingDetails", "Dates, times, and time zone", true, "July 20-31, 2026, local time"),
      ],
      prompt: loadPrompt("google-business-profile-post"),
    }),

    t({
      slug: "tiktok-caption",
      title: "TikTok Caption",
      description:
        "Generate concise, platform-native TikTok captions with optional hooks, CTAs, hashtags, promotional disclosures, and multiple variants.",
      category: "tiktok",
      requiredPlan: "free",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("videoTopic", "Video topic", true, "Three mistakes beginners make when editing videos"),
        v("videoSummary", "What happens in the video?", true, "A quick walkthrough of common editing mistakes and fixes."),
        v("primaryGoal", "Primary goal", true, "Engagement"),
        v("targetAudience", "Target audience", true, "Freelance designers learning short-form video"),
        v("keyMessage", "Key message", true, "Clear edits beat over-polished effects."),
      ],
      prompt: loadPrompt("tiktok-caption"),
    }),

    t({
      slug: "youtube-video-package",
      title: "YouTube Video Package",
      description:
        "Creates a complete YouTube package with titles, thumbnail concepts, retention structure, script, description, chapters, keywords, and pinned comment.",
      category: "youtube",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("videoTopic", "Video topic or offer", true, "How to build a weekly content system"),
        v("primaryGoal", "Primary goal", true, "Educate or explain"),
        v("targetAudience", "Target audience", true, "solo founders who publish weekly"),
        v("keyMessage", "Main viewer takeaway", true, "A simple weekly system without burnout"),
        v("essentialFacts", "Essential facts", true, "Approved points, examples, and claims"),
        v("videoFormat", "Video format", true, "Tutorial or how-to"),
        v("scriptDepth", "Script format", true, "Hybrid script + talking points"),
        v("targetDuration", "Target duration", true, "8–12 minutes"),
      ],
      prompt: loadPrompt("youtube-video-package"),
    }),

    t({
      slug: "email-sequence",
      title: "Email Sequence",
      description:
        "Builds a coherent multi-email sequence with strategy, timing, subject lines, preview text, conversion-focused copy, and compliance-aware delivery notes.",
      category: "email",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("sequenceName", "Sequence name", true, "New customer onboarding"),
        v("sequenceType", "Sequence type", true, "Lead nurture"),
        v("primaryGoal", "Primary goal", true, "Build trust"),
        v("businessName", "Business or brand", true, "Acme Studio"),
        v("offerOrTopic", "Offer or topic", true, "Client-management tool for independent designers"),
        v("targetAudience", "Target audience", true, "Independent designers considering their first client-management tool"),
        v("keyMessage", "Key message", true, "A calmer way to manage client work without losing creative focus"),
        v("outputLanguage", "Output language", true, "English"),
        v("consentStatus", "Contact permission", true, "Confirmed subscribers"),
      ],
      prompt: loadPrompt("email-sequence"),
    }),

    t({
      slug: "product-hunt-launch",
      title: "Product Hunt Launch",
      description:
        "Creates clear Product Hunt messaging, positioning, and a human-centered launch response plan.",
      category: "product_launch",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("productName", "Product name", true, "Creatornivo"),
        v("productUrl", "Product URL", true, "https://www.creatornivo.com"),
        v("productSummary", "What does the product do?", true, "Structured AI templates for creators"),
        v("targetAudience", "Who is it for?", true, "solo founders and marketers"),
        v("coreProblem", "Problem it solves", true, "blank-page friction and inconsistent prompting"),
        v("keyOutcome", "Main user outcome", true, "create more consistent first drafts"),
        v("pricingType", "Pricing type", true, "Freemium"),
      ],
      prompt: loadPrompt("product-hunt-launch"),
    }),

    t({
      slug: "app-store-listing",
      title: "App Store Listing",
      description:
        "Creates publication-ready Apple App Store and Google Play listing copy with ASO, visuals, release notes, and compliance review.",
      category: "ecommerce",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("platformTarget", "Store destination", true, "Apple App Store"),
        v("appName", "App name", true, "Creatornivo"),
        v("appSummary", "What does the app do?", true, "Structured AI templates for creators"),
        v("targetAudience", "Target users", true, "creators who publish weekly"),
        v("coreFeatures", "Core features", true, "templates, library, export"),
        v("keyBenefits", "Key user benefits", true, "Ship drafts faster with structured templates"),
        v("outputLanguage", "Output language", true, "English"),
      ],
      prompt: loadPrompt("app-store-listing"),
    }),

    // ——— Improved ecommerce listings (prisma/template-prompts/*.txt) ———
    t({
      slug: "amazon-listing",
      title: "Amazon Listing",
      description:
        "Creates a claim-safe Amazon title, feature bullets, search terms, and listing review from verified product facts.",
      category: "ecommerce",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("marketplace", "Amazon Marketplace", true, "Amazon.com US"),
        v("productName", "Product name", true, "Desk Cable Kit"),
        v("productCategory", "Category", true, "Office products"),
        v("targetCustomer", "Target customer", true, "remote workers"),
        v("productFacts", "Verified product facts", true, "cable clips, under-desk tray, adhesive"),
      ],
      prompt: loadPrompt("amazon-listing"),
    }),

    t({
      slug: "etsy-listing",
      title: "Etsy Listing",
      description:
        "Creates Etsy listing copy with title options, description, item details, personalization copy, and 13 relevant tags.",
      category: "ecommerce",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("productFormat", "Product format", true, "Physical item"),
        v("sellerRole", "Your role in creating it", true, "Made by seller"),
        v("productName", "Product name", true, "Printable Weekly Meal Planner"),
        v("productOverview", "What are you selling?", true, "Printable PDF meal-planning bundle"),
        v("targetBuyer", "Ideal buyer", true, "busy families and home cooks"),
        v("keySellingPoints", "Main selling points", true, "US Letter and A4 PDFs, Canva version"),
        v("essentialSpecs", "Essential product facts", true, "12-page PDF, instant download"),
      ],
      prompt: loadPrompt("etsy-listing"),
    }),

    t({
      slug: "telegram-post",
      title: "Telegram Post",
      description:
        "Creates readable Telegram posts with native spacing, restrained formatting, a clear action, optional hashtags, and automation-safe length handling.",
      category: "community",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("topicOrOffer", "Topic, Product, or Offer", true, "Creatornivo Early Access update"),
        v("primaryGoal", "Primary Goal", true, "Inform or update"),
        v("targetAudience", "Target Audience", true, "existing Creatornivo users"),
        v("keyMessage", "Core Message", true, "A clear product update for the channel"),
        v("factsAndDetails", "Facts and Required Details", true, "Use only confirmed release notes"),
      ],
      prompt: loadPrompt("telegram-post"),
    }),

    t({
      slug: "whatsapp-broadcast",
      title: "WhatsApp Broadcast",
      description:
        "Compliance-aware WhatsApp broadcast campaign with clear CTA and mobile-first copy",
      category: "community",
      requiredPlan: "pro",
      variables: [
        v("mainMessage", "Main message", true, "Workshop reminder: Thursday 18:00"),
        v("audience", "Audience", true, "registered attendees"),
        v("desiredAction", "Desired action", true, "join at the link"),
        v("campaignType", "Campaign type", false, "reminder / announcement / transactional"),
        v("campaignGoal", "Campaign goal", false, "attendance"),
        v("tone", "Tone", false, "friendly, concise"),
        v("brandVoice", "Brand voice", false, "clear, respectful"),
        v("language", "Language", false, "English"),
        v("sourceDetails", "Approved facts", false, "Only verified times, links, prices"),
        v("startDate", "Send / event date", false, "Only if confirmed"),
        v("restrictions", "Restrictions", false, "No spam CAPS; no invented links"),
      ],
      prompt: loadPrompt("whatsapp-broadcast"),
    }),

    t({
      slug: "discord-announcement",
      title: "Discord Announcement",
      description:
        "Server announcement with role-aware clarity, structure, and one primary CTA",
      category: "community",
      requiredPlan: "pro",
      variables: [
        v("topic", "Topic", true, "v1.2 release notes"),
        v("audience", "Audience", true, "community members"),
        v("tone", "Tone", true, "clear, community-friendly"),
        v("serverName", "Server name", false, "Creatornivo Community"),
        v("desiredAction", "Desired action", false, "try the new templates channel"),
        v("mainMessage", "Main message", false, "What changed and why it matters"),
        v("announcementType", "Announcement type", false, "product update / event / policy"),
        v("language", "Language", false, "English"),
        v("sourceDetails", "Approved facts", false, "Verified changelog only"),
        v("brandVoice", "Community voice", false, "helpful, founder-to-community"),
        v("restrictions", "Restrictions", false, "No invented features or fake urgency"),
      ],
      prompt: loadPrompt("discord-announcement"),
    }),

    t({
      slug: "quora-answer",
      title: "Quora Answer",
      description:
        "Creates a direct Quora answer with optional evidence, transparent affiliation disclosure, and platform-appropriate formatting.",
      category: "community",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("quoraQuestion", "Quora question", true, "How do solo founders stay consistent with content?"),
        v("answerGoal", "Answer goal", true, "Explain clearly"),
        v("directAnswer", "Main answer", true, "Systems beat motivation when the system is simple enough to repeat."),
        v("keyPoints", "Key points to include", true, "Use templates, keep a weekly cadence, and save what works."),
        v("perspectiveType", "Author perspective", true, "Neutral explainer"),
        v("outputLanguage", "Output language", true, "English"),
      ],
      prompt: loadPrompt("quora-answer"),
    }),

    t({
      slug: "substack-post",
      title: "Substack Post",
      description:
        "Generate a publication-ready Substack post with title options, email packaging, editorial structure, optional paid preview, CTA, and publishing notes.",
      category: "community",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("postTopic", "Post topic", true, "Why templates beat blank-page AI chats"),
        v("primaryGoal", "Primary goal", true, "Inform or explain"),
        v("targetAudience", "Target readers", true, "newsletter subscribers who create content"),
        v("centralThesis", "Central message", true, "Structure improves quality and consistency."),
        v("keyPoints", "Key points", true, "Only verified facts, examples, and sections"),
        v("outputLanguage", "Output language", true, "English"),
      ],
      prompt: loadPrompt("substack-post"),
    }),

    t({
      slug: "podcast-script",
      title: "Podcast Script",
      description:
        "Create a recording-ready podcast episode with titles, timed segments, natural host dialogue, transitions, optional guest questions, sponsor copy, and show notes.",
      category: "youtube",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("episodeTopic", "Episode topic", true, "Why small creators struggle to stay consistent"),
        v("primaryGoal", "Primary goal", true, "Educate or explain"),
        v("targetAudience", "Target listeners", true, "solo creators building a content workflow"),
        v("coreMessage", "Core message", true, "A repeatable workflow beats rebuilding every prompt from scratch."),
        v("keyPoints", "Key points and facts", true, "Only verified points, examples, and claims"),
        v("episodeFormat", "Episode format", true, "Solo monologue"),
        v("outputLanguage", "Output language", true, "English"),
        v("episodeLength", "Target duration", true, "20–40 minutes"),
      ],
      prompt: loadPrompt("podcast-script"),
    }),

    t({
      slug: "webinar-package",
      title: "Webinar Package",
      description:
        "Create a complete webinar package with registration copy, agenda, presentation structure, speaker notes, engagement moments, CTA, and follow-up email.",
      category: "marketing",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("webinarTopic", "Webinar topic", true, "Build a 4-week content system"),
        v("primaryGoal", "Primary webinar goal", true, "Educate the audience"),
        v("targetAudience", "Target audience", true, "marketing freelancers"),
        v("audienceProblem", "Audience problem", true, "inconsistent publishing"),
        v("corePromise", "Core webinar promise", true, "leave with a simple weekly plan"),
        v("keyTakeaways", "Key takeaways", true, "Use only confirmed teaching points"),
        v("webinarFormat", "Webinar format", true, "Live webinar"),
        v("outputLanguage", "Output language", true, "English"),
      ],
      prompt: loadPrompt("webinar-package"),
    }),

    t({
      slug: "sms-campaign",
      title: "SMS Campaign",
      description:
        "Generate concise, consent-aware SMS campaigns with clear sender context, a focused CTA, character review, and optional follow-up messages.",
      category: "marketing",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("campaignSubject", "Campaign subject", true, "Appointment reminder"),
        v("senderName", "Sender name", true, "Creatornivo"),
        v("campaignObjective", "Campaign objective", true, "Send a reminder"),
        v("targetAudience", "Target audience", true, "existing opted-in customers"),
        v("essentialDetails", "Essential message details", true, "Use only confirmed facts"),
        v("recipientPermission", "Recipient relationship", true, "Explicit opt-in"),
      ],
      prompt: loadPrompt("sms-campaign"),
    }),

    t({
      slug: "push-notification",
      title: "Push Notification",
      description:
        "Create concise, action-focused mobile or web push notifications with title and body variants, timing guidance, deep-link context, and claim-safe messaging.",
      category: "marketing",
      requiredPlan: "pro",
      // Variables replaced by full form schema in generate-templates-catalog.mjs
      variables: [
        v("campaignSubject", "Notification subject", true, "Order update"),
        v("primaryGoal", "Primary goal", true, "Inform"),
        v("targetAudience", "Target audience", true, "existing app users"),
        v("keyMessage", "Key message and facts", true, "Use only confirmed facts"),
        v("tapDestination", "Tap destination", true, "Order details screen"),
      ],
      prompt: loadPrompt("push-notification"),
    }),

    // ——— Queue 3 (LOW) ———
    t({
      slug: "kickstarter-campaign",
      title: "Kickstarter Campaign",
      description:
        "Full Kickstarter package: pitch, rewards, risks, video, emails, and launch checklist",
      category: "product_launch",
      requiredPlan: "pro",
      variables: [
        v("projectName", "Project name", true, "DeskFlow Stand"),
        v("projectDescription", "Project description", true, "A modular laptop stand for small desks"),
        v("audience", "Backers", true, "remote workers"),
        v("projectGoal", "Project / funding goal", false, "tooling and first production run"),
        v("mainBenefit", "Main benefit", false, "cleaner desk setup in minutes"),
        v("primaryUseCase", "Primary use case", false, "home office laptop docking"),
        v("developmentStage", "Development stage", false, "working prototype"),
        v("language", "Language", false, "English"),
        v("sourceDetails", "Approved facts", false, "Verified project details only"),
        v("painPoint", "Backer problem", false, "cables and laptop height on small desks"),
        v("desiredOutcome", "Desired outcome", false, "stable elevated laptop workspace"),
        v("restrictions", "Restrictions", false, "No invented shipping dates or social proof"),
      ],
      prompt: loadPrompt("kickstarter-campaign"),
    }),

    t({
      slug: "indie-hackers-post",
      title: "Indie Hackers Post",
      description:
        "Build-in-public Indie Hackers post with transparent metrics and community-first framing",
      category: "community",
      requiredPlan: "pro",
      variables: [
        v("topic", "Post topic", true, "What we learned shipping template expansion"),
        v("productName", "Product name", true, "Creatornivo"),
        v("tone", "Tone", true, "transparent, peer-to-peer"),
        v("postType", "Post type", false, "build-in-public update / milestone report"),
        v("mainMessage", "Main message", false, "Ship inventory before marketing claims"),
        v("productDescription", "Product description", false, "Structured AI templates for creators"),
        v("productStage", "Product stage", false, "Early Access"),
        v("goal", "Post goal", false, "share a real lesson and get feedback"),
        v("desiredAction", "Desired community response", false, "share similar experiments"),
        v("communityQuestion", "Community question", false, "What free-tier rule worked for you?"),
        v("authorName", "Author name", false, "Alex"),
        v("authorRelationship", "Relationship to product", false, "solo founder building it"),
        v("metrics", "Approved metrics", false, "Only real metrics if supplied"),
        v("sourceDetails", "Approved facts", false, "Verified project details only"),
        v("language", "Language", false, "English"),
        v("restrictions", "Restrictions", false, "No invented MRR, users, or quotes"),
      ],
      prompt: loadPrompt("indie-hackers-post"),
    }),

    t({
      slug: "github-readme",
      title: "GitHub README",
      description:
        "Developer-friendly GitHub README with accurate install, usage, and contribution guidance",
      category: "app_ux",
      requiredPlan: "pro",
      variables: [
        v("projectName", "Project name", true, "creatornivo-cli"),
        v("projectDescription", "What it does", true, "CLI helpers for content workflows"),
        v("audience", "Audience", true, "developers"),
        v("tagline", "Tagline", false, "Structured content helpers for founders"),
        v("projectType", "Project type", false, "CLI tool / library / app"),
        v("currentVersion", "Current version", false, "0.1.0"),
        v("frameworks", "Tech stack / frameworks", false, "Node, TypeScript"),
        v("language", "Language", false, "English"),
        v("sourceDetails", "Features / install facts", false, "Verified commands only"),
        v("repositoryUrl", "Repository URL", false, "https://github.com/example/repo"),
        v("restrictions", "Restrictions", false, "No invented commands or badges"),
      ],
      prompt: loadPrompt("github-readme"),
    }),

    t({
      slug: "review-response",
      title: "Review Response",
      description:
        "Professional public review reply with accurate product facts and calm tone",
      category: "sales",
      requiredPlan: "pro",
      variables: [
        v("reviewText", "Customer review", true, '"Love the templates but wish export was on free."'),
        v("starRating", "Star rating", true, "4"),
        v("businessName", "Business / product name", true, "Creatornivo"),
        v("tone", "Tone", false, "grateful, professional"),
        v("brandVoice", "Brand voice", false, "honest Early Access product"),
        v("language", "Language", false, "English"),
        v("desiredReviewerAction", "Desired next step", false, "contact support for export options"),
        v("restrictions", "Restrictions", false, "No invented roadmap or refunds"),
      ],
      prompt: loadPrompt("review-response"),
    }),

    t({
      slug: "sales-proposal",
      title: "Sales Proposal",
      description:
        "Complete B2B sales proposal package with scope, investment, and next steps",
      category: "sales",
      requiredPlan: "pro",
      variables: [
        v("clientName", "Client name", true, "Northwind Media"),
        v("solutionSummary", "Proposed solution", true, "Creatornivo Pro seats + onboarding workshop"),
        v("businessOutcomes", "Desired outcomes", true, "stable weekly publishing"),
        v("proposalTitle", "Proposal title", false, "Content operations proposal"),
        v("solutionName", "Solution name", false, "Creatornivo Pro rollout"),
        v("scopeSummary", "Scope summary", false, "Seats, onboarding, first templates setup"),
        v("totalPrice", "Investment / price", false, "Only approved commercial details"),
        v("language", "Language", false, "English"),
        v("clientIndustry", "Client industry", false, "media / marketing"),
        v("proposalGoal", "Proposal goal", false, "secure pilot approval"),
      ],
      prompt: loadPrompt("sales-proposal"),
    }),

    t({
      slug: "press-release",
      title: "Press Release",
      description:
        "Factual press-release package with newsworthy framing and verification checklist",
      category: "sales",
      requiredPlan: "pro",
      variables: [
        v("announcement", "Announcement / news", true, "Creatornivo expands template library for creators"),
        v("productName", "Product name", true, "Creatornivo"),
        v("organizationName", "Organization name", true, "Creatornivo"),
        v("announcementSubject", "Subject / focus", false, "Platform template expansion"),
        v("releaseName", "Release name", false, "Template library expansion"),
        v("primaryQuote", "Approved quote", false, "None — omit if not supplied"),
        v("language", "Language", false, "English"),
        v("sourceDetails", "Approved facts", false, "Verified only"),
        v("productDescription", "Product description", false, "Early Access AI writing workspace"),
      ],
      prompt: loadPrompt("press-release"),
    }),

    t({
      slug: "website-popup",
      title: "Website Popup",
      description:
        "Accessible website popup package with targeting, copy, CTA, and launch checklist",
      category: "app_ux",
      requiredPlan: "pro",
      variables: [
        v("offer", "Offer", true, "Get Early Access pricing details"),
        v("audience", "Audience", true, "pricing page visitors"),
        v("desiredAction", "Desired action", true, "start free"),
        v("popupGoal", "Popup goal", false, "capture interested visitors"),
        v("popupType", "Popup type", false, "modal / exit-intent / banner"),
        v("tone", "Tone", false, "clear, low-pressure"),
        v("brandVoice", "Brand voice", false, "honest Early Access product"),
        v("language", "Language", false, "English"),
        v("websiteName", "Website / product", false, "Creatornivo"),
        v("sourceDetails", "Approved facts", false, "Only verified offer details"),
        v("restrictions", "Restrictions", false, "No fake scarcity or dark patterns"),
      ],
      prompt: loadPrompt("website-popup"),
    }),

    t({
      slug: "in-app-ux-copy",
      title: "In-App UX Copy",
      description:
        "Task-focused microcopy for screens, empty states, errors, and confirmations",
      category: "app_ux",
      requiredPlan: "pro",
      variables: [
        v("userGoal", "User goal", true, "save first generation"),
        v("userTask", "User task", true, "save generated content to library"),
        v("copyType", "Copy type", true, "empty state / error / confirmation / tooltip"),
        v("productName", "Product name", false, "Creatornivo"),
        v("productType", "Product type", false, "SaaS platform"),
        v("flowName", "Flow name", false, "Library onboarding"),
        v("screenName", "Screen / component", false, "Library empty state"),
        v("userState", "Current user state", false, "user has not saved anything yet"),
        v("desiredAction", "Desired action", false, "save first item"),
        v("audienceSegment", "User segment", false, "new free users"),
        v("tone", "Tone", false, "helpful, concise"),
        v("brandVoice", "Brand voice", false, "honest Early Access product"),
        v("language", "Language", false, "English"),
        v("preferredLength", "Preferred length", false, "Max ~2 short sentences"),
        v("sourceDetails", "Approved product facts", false, "Only verified behavior"),
        v("restrictions", "Restrictions", false, "No invented features or policies"),
      ],
      prompt: loadPrompt("in-app-ux-copy"),
    }),
  ];
}
