import type { GuideArticle } from "@/config/guides/types";

/**
 * Static public guides. Keep claims aligned with product truth:
 * Free 5 completed drafts / UTC day; Pro 100 / UTC calendar month;
 * self-serve checkout may be unavailable; human review required.
 * Never include system prompts, private template prompts, or fake social proof.
 */
export const guideArticles: GuideArticle[] = [
  {
    slug: "what-is-creatornivo",
    title: "What is CreatorNivo?",
    description:
      "CreatorNivo is an AI-assisted text drafting SaaS that uses predefined business templates and structured inputs so you can review editable drafts before use.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "product",
    relatedSlugs: [
      "how-template-based-ai-drafting-works",
      "ai-assisted-drafting-vs-chatbots",
      "review-edit-verify-ai-drafts",
    ],
    primaryCta: "register",
    sections: [
      {
        paragraphs: [
          "CreatorNivo is an AI-assisted text drafting SaaS for marketers, founders, and creators who need structured business copy—not an open-ended “generate anything” chatbot.",
          "You choose a predefined template, fill structured inputs (topic, audience, tone, facts you actually know), and receive an editable draft. You should review, edit, and verify every draft before you publish, send, or ship it.",
        ],
      },
      {
        heading: "What you can do",
        paragraphs: [
          "The product is a template-based drafting workspace: pick a workflow (for example LinkedIn posts, newsletters, or product pages), complete the form, generate a draft, then save useful outputs to your personal library when you are ready.",
        ],
        list: [
          "Predefined business templates with guided fields",
          "AI-assisted drafts you can edit before use",
          "A personal library for saved drafts",
          "Export options on eligible plans (as shown in the product)",
        ],
      },
      {
        heading: "Plans and limits (product configuration today)",
        paragraphs: [
          "Usage is limited so capacity stays fair and predictable. User-facing quota counts successful completed generations only.",
        ],
        list: [
          "Free: up to 5 completed drafts per UTC day",
          "Pro / Early Access: up to 100 completed drafts per UTC calendar month",
          "Self-serve paid checkout may be unavailable while we finalize our payment provider; Early Access and paid access requests are handled via support as described on the Pricing page",
        ],
      },
      {
        heading: "What CreatorNivo is not",
        paragraphs: [
          "It is not a promise of rankings, conversion lifts, or finished copy that needs no human review. Outputs are drafts. You remain responsible for accuracy, claims, disclosures, and the policies of any channel where you publish.",
        ],
      },
    ],
  },
  {
    slug: "how-template-based-ai-drafting-works",
    title: "How template-based AI drafting works",
    description:
      "A simple workflow: choose a predefined template, fill structured inputs, generate an editable draft, then review and save—without open-ended prompt engineering.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "workflow",
    relatedSlugs: [
      "what-is-creatornivo",
      "why-structured-inputs-improve-ai-drafts",
      "review-edit-verify-ai-drafts",
    ],
    primaryCta: "templates",
    sections: [
      {
        paragraphs: [
          "CreatorNivo uses a template-first workflow. Instead of starting from a blank chat, you pick a predefined business template that already knows the shape of the deliverable—then you supply the facts and direction for that draft.",
        ],
      },
      {
        heading: "The workflow in four steps",
        paragraphs: [
          "This is the same pattern whether you are drafting social posts, longer pages, or launch copy.",
        ],
        list: [
          "Choose a template that matches the channel and format you need",
          "Fill structured inputs: topic, audience, tone, must-include facts, and other fields the form asks for",
          "Generate an AI-assisted draft assembled securely on the server from your inputs and the template",
          "Review, edit, and verify the draft—then copy, save to your library, or continue iterating",
        ],
      },
      {
        heading: "Why templates instead of a blank prompt",
        paragraphs: [
          "Templates keep the request structured: required fields, optional sections, and format expectations sit in the product UI. That reduces guesswork and helps you produce drafts that are easier to evaluate—without requiring you to invent a custom master instruction yourself.",
          "Template instructions stay on the server. You work with fields and the draft output, not private instruction text.",
        ],
      },
      {
        heading: "Limits still apply",
        paragraphs: [
          "Free accounts can complete up to 5 drafts per UTC day. Pro and Early Access capacity is currently up to 100 completed drafts per UTC calendar month in product configuration. Self-serve paid checkout may be unavailable; see Pricing for Early Access options via support.",
        ],
      },
    ],
  },
  {
    slug: "why-structured-inputs-improve-ai-drafts",
    title: "Why structured inputs improve AI drafts",
    description:
      "Clear topic, audience, facts, and constraints usually produce more useful AI-assisted drafts than vague one-line requests—while you still review every output.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "how-to",
    relatedSlugs: [
      "how-template-based-ai-drafting-works",
      "review-edit-verify-ai-drafts",
    ],
    primaryCta: "register",
    sections: [
      {
        paragraphs: [
          "AI-assisted drafting works best when the model receives a specific brief. CreatorNivo’s templates ask for structured inputs so your draft has a real subject, audience, and set of constraints—not a generic filler paragraph.",
        ],
      },
      {
        heading: "What “structured” means here",
        paragraphs: [
          "Each template presents labeled fields (required and optional). Typical inputs include the topic or offer, who the reader is, the goal of the piece, tone, language, and facts you have already verified.",
        ],
        list: [
          "Specific beats vague: “SaaS onboarding email for trial users who stalled on day 3” is clearer than “write a marketing email”",
          "Real facts beat invented ones: only include proof points, prices, names, and claims you can stand behind",
          "Constraints help: length preferences, must-include points, and what to avoid reduce unhelpful digressions",
        ],
      },
      {
        heading: "What structured inputs do not guarantee",
        paragraphs: [
          "Better inputs usually produce more relevant drafts. They do not guarantee search rankings, conversions, or legal compliance. You still need to review, edit, and verify before use.",
          "If a field asks for sources, proof, or quotes, leave it empty rather than inventing material. Honest blanks are safer than fabricated evidence.",
        ],
      },
      {
        heading: "Capacity while you practice",
        paragraphs: [
          "On Free, you can complete up to 5 drafts per UTC day—enough to learn the workflow. Pro / Early Access currently allows up to 100 completed drafts per UTC calendar month. Self-serve checkout may be paused; Early Access is described on the Pricing page.",
        ],
      },
    ],
  },
  {
    slug: "review-edit-verify-ai-drafts",
    title: "Review, edit, and verify AI-assisted drafts",
    description:
      "Treat every CreatorNivo output as a draft: check facts, claims, tone, and channel rules before you publish or send. Human review is required.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "responsible-use",
    relatedSlugs: [
      "what-is-creatornivo",
      "why-structured-inputs-improve-ai-drafts",
      "common-input-mistakes",
    ],
    primaryCta: "responsible-use",
    sections: [
      {
        paragraphs: [
          "CreatorNivo produces AI-assisted drafts from predefined templates and your inputs. Drafts are a starting point—not a finished statement of fact, legal advice, or guaranteed marketing outcome.",
          "You must review, edit, and verify outputs before you use them publicly or commercially. That responsibility stays with you.",
        ],
      },
      {
        heading: "A practical review checklist",
        paragraphs: [
          "Use this as a quick pass after each generation. Adapt it to your channel and industry.",
        ],
        list: [
          "Facts: names, numbers, dates, product behavior, and pricing match reality",
          "Claims: no exaggerated outcomes, invented customer quotes, or unsupported “best/guaranteed” language",
          "Voice: tone fits your brand and the audience you named in the form",
          "Compliance: disclosures, platform rules, and local requirements for ads or outreach are satisfied",
          "Safety: no private data, credentials, or confidential material that should not leave your organization",
        ],
      },
      {
        heading: "Edit before you ship",
        paragraphs: [
          "Treat the generate screen and your library as a writing desk. Shorten fluff, fix awkward phrasing, add the details only you know, and remove anything the model inferred incorrectly.",
          "Saving a draft to your library does not replace review. It only stores the text so you can continue later.",
        ],
      },
      {
        heading: "Honest product limits",
        paragraphs: [
          "Free: up to 5 completed drafts per UTC day. Pro / Early Access: up to 100 completed drafts per UTC calendar month in current product configuration. Failed or incomplete runs should not permanently consume completed-generation quota.",
          "Self-serve paid checkout may be unavailable while we finalize our payment provider. Early Access and paid access requests go through support as described on Pricing. For intended use and prohibited uses, see Responsible Use.",
        ],
      },
    ],
  },
  {
    slug: "ai-assisted-drafting-vs-chatbots",
    title: "AI-assisted drafting vs open-ended chatbots",
    description:
      "How CreatorNivo’s template-based, structured-input workflow differs from open-ended chat tools—and why review still matters either way.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "product",
    relatedSlugs: [
      "what-is-creatornivo",
      "how-template-based-ai-drafting-works",
      "why-structured-inputs-improve-ai-drafts",
    ],
    primaryCta: "templates",
    sections: [
      {
        paragraphs: [
          "Many AI tools are open-ended chatbots: you type a freeform request and hope the reply fits. CreatorNivo is an AI-assisted text drafting SaaS built around predefined business templates and structured inputs instead.",
          "Both approaches can produce useful text. They optimize for different jobs. CreatorNivo is for repeatable business drafts you still review, edit, and verify before use.",
        ],
      },
      {
        heading: "Template-based drafting",
        paragraphs: [
          "You choose a template for a known format (for example a social post, newsletter, or product page), fill labeled fields, and generate an editable draft. The product UI carries structure so you are not reinventing the brief every time.",
        ],
        list: [
          "Predefined templates for business content workflows",
          "Structured inputs: topic, audience, tone, facts you supply",
          "Server-side assembly of the request—you work with fields and output, not private template instruction text",
          "A library for saving drafts you want to keep iterating",
        ],
      },
      {
        heading: "Open-ended chat",
        paragraphs: [
          "Chat tools shine for exploration, brainstorming, and one-off questions. They often lack a fixed form for each channel, so quality depends heavily on how you prompt and on what you remember to include.",
          "CreatorNivo does not try to replace every chat use case. It focuses on structured drafting from templates so marketers and founders can move from brief to draft with fewer blank-page steps.",
        ],
      },
      {
        heading: "What stays the same",
        paragraphs: [
          "No drafting tool removes your responsibility. AI-assisted outputs are drafts. Review facts, claims, and channel rules before you publish or send.",
          "Capacity is limited: Free allows up to 5 completed AI-assisted drafts per UTC day; Pro Early Access currently allows up to 100 completed drafts per UTC calendar month. Self-serve paid checkout may be unavailable; see Pricing for Early Access options.",
        ],
      },
    ],
  },
  {
    slug: "free-vs-pro-generations",
    title: "Free vs Pro generation limits",
    description:
      "Honest Free and Pro Early Access limits for completed AI-assisted drafts: 5 per UTC day on Free, 100 per UTC calendar month on Pro while self-serve checkout is paused.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "product",
    relatedSlugs: [
      "what-is-creatornivo",
      "using-the-draft-library",
      "how-template-based-ai-drafting-works",
    ],
    primaryCta: "pricing",
    sections: [
      {
        paragraphs: [
          "CreatorNivo is an AI-assisted, template-based drafting workspace with plan limits so capacity stays fair. User-facing quota counts successful completed generations only—not every failed attempt.",
          "Self-serve paid checkout may be unavailable while we finalize our payment provider. Pro and Early Access access may be granted through support as described on the Pricing page. This article reflects current product configuration, not a future billing-period system.",
        ],
      },
      {
        heading: "Free plan",
        paragraphs: [
          "Free is meant for trying the workflow: pick templates, fill structured inputs, generate drafts, and practice review before you rely on higher volume.",
        ],
        list: [
          "Up to 5 completed AI-assisted drafts per UTC day",
          "Access to free-tier templates as shown in the product",
          "A personal library with a limited number of saved drafts",
          "Daily capacity is capped; Free is for learning the workflow",
        ],
      },
      {
        heading: "Pro / Early Access (today)",
        paragraphs: [
          "Pro Early Access currently uses a higher monthly completed-draft limit while self-serve checkout is paused and the Early Access flow is active.",
        ],
        list: [
          "Up to 100 completed AI-assisted drafts per UTC calendar month",
          "Access to Pro templates and export options as shown in the product",
          "Higher library capacity (unlimited saved drafts on Pro in product configuration)",
          "Does not yet mean “quota resets on your payment provider anniversary date”—that would require a future payment integration change",
        ],
      },
      {
        heading: "What counts toward the limit",
        paragraphs: [
          "Completed drafts that finish successfully count. Validation failures, refusals, and incomplete runs should not permanently consume completed-generation quota under current product rules.",
          "Always review, edit, and verify drafts before use—higher limits do not reduce that responsibility.",
        ],
      },
      {
        heading: "How to choose next steps",
        paragraphs: [
          "Start free if you are learning the template workflow. If you need more monthly capacity or Pro templates, open Pricing for Early Access options. There is no pressure language here—only the limits the product enforces today.",
        ],
      },
    ],
  },
  {
    slug: "common-input-mistakes",
    title: "Common structured-input mistakes",
    description:
      "Vague topics, invented proof, missing audience, and other input mistakes that weaken AI-assisted drafts—and how to fix them before you generate.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "how-to",
    relatedSlugs: [
      "why-structured-inputs-improve-ai-drafts",
      "review-edit-verify-ai-drafts",
      "how-template-based-ai-drafting-works",
    ],
    primaryCta: "templates",
    sections: [
      {
        paragraphs: [
          "CreatorNivo’s templates ask for structured inputs because clearer briefs usually produce more useful AI-assisted drafts. The reverse is also true: weak inputs create generic or risky output you then have to rewrite.",
          "None of this guarantees rankings or conversions. It only improves the odds that the draft is something you can review, edit, and verify into real work.",
        ],
      },
      {
        heading: "Mistakes to avoid",
        paragraphs: [
          "Watch for these patterns when you fill a form before generating.",
        ],
        list: [
          "Vague topic: “write something about marketing” with no offer, audience, or goal",
          "Missing audience: no reader role, stage, or context for tone and depth",
          "Invented proof: fake metrics, quotes, or case results in fields that ask for verified facts",
          "Overloaded goals: one draft trying to sell, educate, and announce three offers at once",
          "Ignoring required fields: generating with empty essentials the template marks as required",
          "Pasting secrets: API keys, private customer data, or credentials into free-text fields",
        ],
      },
      {
        heading: "Better defaults",
        paragraphs: [
          "Prefer specific, honest inputs. If you do not have a proof point, leave proof fields empty rather than fabricating them. Name one primary reader and one primary goal. Keep tone instructions short and concrete.",
        ],
      },
      {
        heading: "After you generate",
        paragraphs: [
          "Even strong inputs need a human pass. Check facts, claims, and channel rules. Save only drafts worth keeping to your library.",
          "Free: up to 5 completed drafts per UTC day. Pro Early Access: up to 100 completed drafts per UTC calendar month while checkout remains paused and Early Access is active. See Pricing for current options.",
        ],
      },
    ],
  },
  {
    slug: "using-the-draft-library",
    title: "Using the draft library",
    description:
      "How CreatorNivo’s personal library helps you save, revisit, and (on eligible plans) export AI-assisted drafts you still review before use.",
    publishedAt: "2026-07-24",
    updatedAt: "2026-07-24",
    category: "workflow",
    relatedSlugs: [
      "how-template-based-ai-drafting-works",
      "free-vs-pro-generations",
      "review-edit-verify-ai-drafts",
    ],
    primaryCta: "register",
    sections: [
      {
        paragraphs: [
          "After you generate an AI-assisted draft from a template, you can save useful output to your personal library. The library is a workspace for your drafts—not a content feed, marketplace, or social proof wall.",
          "Saving does not replace review. You should still edit and verify text before you publish or send it.",
        ],
      },
      {
        heading: "What the library is for",
        paragraphs: [
          "Use it to keep versions you may reuse, compare, or finish later. Typical steps: generate on a template form, refine the draft, save with a clear title, then open the item from Library when you return.",
        ],
        list: [
          "Store drafts tied to your account",
          "Reopen items to copy or continue editing offline in your own tools",
          "Export to .md or .txt on eligible Pro plans as shown in the product",
          "Stay within plan save limits on Free (a capped number of saved drafts)",
        ],
      },
      {
        heading: "What the library is not",
        paragraphs: [
          "It is not unlimited public hosting for every generation. Free accounts have a finite save cap. It does not publish content for you, and it does not mean a draft is approved for external use.",
          "Generation limits are separate from save limits: Free includes up to 5 completed AI-assisted drafts per UTC day; Pro Early Access currently includes up to 100 completed drafts per UTC calendar month while self-serve checkout may be unavailable.",
        ],
      },
      {
        heading: "Practical tips",
        paragraphs: [
          "Title saves with the channel and topic so you can find them later. Delete drafts you will never use so Free save slots stay available. Prefer quality reviews over saving every experiment.",
        ],
      },
    ],
  },
];
