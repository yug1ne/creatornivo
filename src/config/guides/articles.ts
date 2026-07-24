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
];
