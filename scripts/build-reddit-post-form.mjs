/**
 * Builds the Reddit Post form schema from the approved 23-field specification.
 * Does NOT modify the prompt text. It verifies that every prompt variable has
 * exactly one form field before writing the form JSON.
 *
 * Usage: node scripts/build-reddit-post-form.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const promptPath = path.join(root, "prisma", "template-prompts", "reddit-post.txt");
const outPath = path.join(root, "src", "config", "template-forms", "reddit-post-variables.json");

const groups = [
  {
    "id": "essentials",
    "title": "Essentials",
    "description": "Core topic, goal, subreddit, readers, facts, perspective, response, tone, and language for a useful first Reddit post.",
    "defaultOpen": true
  },
  {
    "id": "subreddit_fit_post_settings",
    "title": "Subreddit Fit & Post Settings",
    "description": "Community rules, title requirements, flair, length, and Reddit formatting conventions.",
    "defaultOpen": false
  },
  {
    "id": "promotion_disclosure",
    "title": "Promotion & Disclosure",
    "description": "Links, self-promotion, ownership, employment, sponsorship, and other affiliation details.",
    "defaultOpen": false
  },
  {
    "id": "accuracy_boundaries",
    "title": "Accuracy & Boundaries",
    "description": "Sources, privacy exclusions, high-stakes context, jurisdiction, and additional constraints.",
    "defaultOpen": false
  }
];

const variables = [
  {
    "key": "topicOrSituation",
    "label": "Topic or situation",
    "placeholder": "Describe what happened, what you want to discuss, or what you want to post about.",
    "required": true,
    "type": "textarea",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Explain the central subject or situation in your own words.",
    "help": {
      "what": "Explain the central subject or situation in your own words.",
      "why": "The model cannot safely determine the actual subject of the post without user input.",
      "example": "Describe what happened, what you want to discuss, or what you want to post about.",
      "avoid": "Avoid vague topics, manufactured drama, or claiming a personal situation that did not happen."
    },
    "fullWidth": true,
    "maxLength": 800
  },
  {
    "key": "primaryGoal",
    "label": "Primary goal",
    "placeholder": "Choose what the post should accomplish.",
    "required": true,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "This determines the post’s native Reddit structure.",
    "help": {
      "what": "This determines the post’s native Reddit structure.",
      "why": "A question, personal story, guide, and feedback request require substantially different structures.",
      "example": "Choose what the post should accomplish.",
      "avoid": "Avoid mixing several goals or selecting a promotional goal when the post should be community-first."
    },
    "fullWidth": false,
    "options": [
      "Ask for advice",
      "Start a discussion",
      "Share an experience",
      "Explain or teach",
      "Request feedback",
      "Share a resource",
      "Post a project update"
    ]
  },
  {
    "key": "targetSubreddit",
    "label": "Target subreddit",
    "placeholder": "For example: r/webdev",
    "required": true,
    "type": "text",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Enter the community where the post is intended to appear.",
    "help": {
      "what": "Enter the community where the post is intended to appear.",
      "why": "Reddit posts must be adapted to the context and expectations of a specific community.",
      "example": "For example: r/webdev",
      "avoid": "Avoid guessing a community name or using a subreddit that does not match the topic."
    },
    "fullWidth": false,
    "maxLength": 100
  },
  {
    "key": "intendedReaders",
    "label": "Intended readers",
    "placeholder": "For example: indie developers who have launched a SaaS product",
    "required": true,
    "type": "text",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Describe the people who should understand and respond to the post.",
    "help": {
      "what": "Describe the people who should understand and respond to the post.",
      "why": "Reader knowledge and experience materially affect vocabulary, context, and question depth.",
      "example": "For example: indie developers who have launched a SaaS product",
      "avoid": "Avoid ?everyone? or audience assumptions that are not relevant to the subreddit."
    },
    "fullWidth": false,
    "maxLength": 300
  },
  {
    "key": "keyFactsAndContext",
    "label": "Key facts and context",
    "placeholder": "Add the facts, timeline, attempts, examples, or details that must appear.",
    "required": true,
    "type": "textarea",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Include only information that is true and safe to publish.",
    "help": {
      "what": "Include only information that is true and safe to publish.",
      "why": "The post requires a reliable factual basis and enough context to avoid becoming a low-effort submission.",
      "example": "Add the facts, timeline, attempts, examples, or details that must appear.",
      "avoid": "Avoid invented results, user counts, revenue, testimonials, dates, or experiences."
    },
    "fullWidth": true,
    "maxLength": 1500
  },
  {
    "key": "authorPerspective",
    "label": "Author perspective",
    "placeholder": "Choose the perspective used in the post.",
    "required": false,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "This prevents the model from inventing experience or expertise.",
    "help": {
      "what": "This prevents the model from inventing experience or expertise.",
      "why": "The model must know whether it can write from personal experience, professional knowledge, or a neutral viewpoint.",
      "example": "Choose the perspective used in the post.",
      "avoid": "Avoid presenting second-hand information as first-hand experience."
    },
    "fullWidth": false,
    "options": [
      "Personal experience",
      "Personal opinion",
      "General community member",
      "Professional expertise",
      "Founder or creator",
      "Employee or team member",
      "Researcher or observer",
      "Organization representative"
    ]
  },
  {
    "key": "desiredResponse",
    "label": "Desired response",
    "placeholder": "Choose what you want readers to contribute.",
    "required": false,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Used to create one natural discussion invitation.",
    "help": {
      "what": "Used to create one natural discussion invitation.",
      "why": "The desired type of comments determines how the closing question should be framed.",
      "example": "Choose what you want readers to contribute.",
      "avoid": "Avoid fishing for compliments, upvotes, karma, or generic ?thoughts?? replies."
    },
    "fullWidth": false,
    "options": [
      "Auto",
      "Advice",
      "Similar experiences",
      "Constructive critique",
      "Technical answers",
      "Open discussion",
      "Resource recommendations",
      "No explicit response"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "tone",
    "label": "Tone",
    "placeholder": "Choose how the post should sound.",
    "required": false,
    "type": "select",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "Reddit usually responds better to a natural voice than polished marketing copy.",
    "help": {
      "what": "Reddit usually responds better to a natural voice than polished marketing copy.",
      "why": "Tone materially changes how authentic and community-appropriate the post feels.",
      "example": "Choose how the post should sound.",
      "avoid": "Avoid corporate polish, fake humility, forced slang, or manipulative urgency."
    },
    "fullWidth": false,
    "options": [
      "Natural and candid",
      "Casual",
      "Thoughtful",
      "Direct",
      "Technical",
      "Humorous",
      "Vulnerable",
      "Professional but human"
    ],
    "defaultValue": "Natural and candid"
  },
  {
    "key": "outputLanguage",
    "label": "Output language",
    "placeholder": "For example: English, Ukrainian, Spanish",
    "required": false,
    "type": "text",
    "group": "essentials",
    "groupTitle": "Essentials",
    "hint": "The complete generated package will use this language.",
    "help": {
      "what": "The complete generated package will use this language.",
      "why": "Reddit contains multilingual communities, and language cannot always be inferred from the topic.",
      "example": "For example: English, Ukrainian, Spanish",
      "avoid": "Avoid mixing languages unless the subreddit and audience expect it."
    },
    "fullWidth": false,
    "maxLength": 80,
    "defaultValue": "English"
  },
  {
    "key": "subredditRules",
    "label": "Subreddit rules",
    "placeholder": "Paste relevant rules about titles, links, self-promotion, formatting, or post types.",
    "required": false,
    "type": "textarea",
    "group": "subreddit_fit_post_settings",
    "groupTitle": "Subreddit Fit & Post Settings",
    "hint": "Add only rules that may affect this particular post.",
    "help": {
      "what": "Add only rules that may affect this particular post.",
      "why": "Individual communities can enforce rules that differ from Reddit-wide conventions.",
      "example": "Paste relevant rules about titles, links, self-promotion, formatting, or post types.",
      "avoid": "Avoid invented rules, moderator approval, flair names, karma thresholds, or loopholes."
    },
    "fullWidth": true,
    "maxLength": 2500
  },
  {
    "key": "titleConstraints",
    "label": "Title requirements",
    "placeholder": "For example: start with [Feedback], avoid questions, or include the product category.",
    "required": false,
    "type": "textarea",
    "group": "subreddit_fit_post_settings",
    "groupTitle": "Subreddit Fit & Post Settings",
    "hint": "Add any required prefix, wording, structure, or length restriction.",
    "help": {
      "what": "Add any required prefix, wording, structure, or length restriction.",
      "why": "Some communities impose title-specific rules that must be followed precisely.",
      "example": "For example: start with [Feedback], avoid questions, or include the product category.",
      "avoid": "Avoid clickbait, all caps, fake urgency, unsupported numbers, or ignored title rules."
    },
    "fullWidth": true,
    "maxLength": 500
  },
  {
    "key": "flairOrTag",
    "label": "Flair or tag",
    "placeholder": "For example: Discussion, Feedback, Question",
    "required": false,
    "type": "text",
    "group": "subreddit_fit_post_settings",
    "groupTitle": "Subreddit Fit & Post Settings",
    "hint": "Enter the required or preferred post flair when known.",
    "help": {
      "what": "Enter the required or preferred post flair when known.",
      "why": "Flair can be mandatory and may determine how the post is categorized.",
      "example": "For example: Discussion, Feedback, Question",
      "avoid": "Avoid inventing a flair or using one that is not available in the target subreddit."
    },
    "fullWidth": false,
    "maxLength": 100
  },
  {
    "key": "lengthPreference",
    "label": "Post length",
    "placeholder": "Choose the preferred level of detail.",
    "required": false,
    "type": "select",
    "group": "subreddit_fit_post_settings",
    "groupTitle": "Subreddit Fit & Post Settings",
    "hint": "Auto selects the shortest length that fully supports the goal.",
    "help": {
      "what": "Auto selects the shortest length that fully supports the goal.",
      "why": "A quick question and a detailed guide require different levels of context.",
      "example": "Choose the preferred level of detail.",
      "avoid": "Avoid padding a short discussion or compressing a detailed guide until it loses value."
    },
    "fullWidth": false,
    "options": [
      "Auto",
      "Short",
      "Standard",
      "Detailed",
      "Long-form"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "formattingPreference",
    "label": "Formatting style",
    "placeholder": "Choose how the body should be organized.",
    "required": false,
    "type": "select",
    "group": "subreddit_fit_post_settings",
    "groupTitle": "Subreddit Fit & Post Settings",
    "hint": "Auto uses light Reddit formatting only when it improves readability.",
    "help": {
      "what": "Auto uses light Reddit formatting only when it improves readability.",
      "why": "Formatting requirements differ between questions, stories, technical guides, and longer explanations.",
      "example": "Choose how the body should be organized.",
      "avoid": "Avoid decorative separators, hashtag blocks, excessive bolding, or blog-like formatting."
    },
    "fullWidth": false,
    "options": [
      "Auto",
      "Plain paragraphs",
      "Light Markdown",
      "Bulleted guide",
      "Numbered steps",
      "Include TL;DR"
    ],
    "defaultValue": "Auto"
  },
  {
    "key": "promotionIntent",
    "label": "Promotion intent",
    "placeholder": "Choose whether the post mentions or links to something connected to you.",
    "required": false,
    "type": "select",
    "group": "promotion_disclosure",
    "groupTitle": "Promotion & Disclosure",
    "hint": "Used to prevent accidental or covert self-promotion.",
    "help": {
      "what": "Used to prevent accidental or covert self-promotion.",
      "why": "Promotional intent affects disclosure, link use, framing, and community-rule checks.",
      "example": "Choose whether the post mentions or links to something connected to you.",
      "avoid": "Avoid disguising promotion as a neutral community discovery."
    },
    "fullWidth": false,
    "options": [
      "No promotion",
      "Mention own project if relevant",
      "Request feedback on own work",
      "Share a free resource",
      "Share an external article or link",
      "Present a commercial offer"
    ],
    "defaultValue": "No promotion"
  },
  {
    "key": "relationshipToSubject",
    "label": "Relationship to subject",
    "placeholder": "Choose your connection to the subject.",
    "required": false,
    "type": "select",
    "group": "promotion_disclosure",
    "groupTitle": "Promotion & Disclosure",
    "hint": "Relevant relationships must be represented honestly.",
    "help": {
      "what": "Relevant relationships must be represented honestly.",
      "why": "The post must not present an affiliated person as an independent community member.",
      "example": "Choose your connection to the subject.",
      "avoid": "Avoid hiding ownership, employment, sponsorship, advisory, affiliate, or other relationships."
    },
    "fullWidth": false,
    "options": [
      "No affiliation",
      "Creator or owner",
      "Employee or team member",
      "Affiliate or sponsor",
      "Customer or user",
      "Professional adviser",
      "Other"
    ],
    "defaultValue": "No affiliation"
  },
  {
    "key": "affiliationDetails",
    "label": "Affiliation details",
    "placeholder": "Briefly explain your role, connection, sponsorship, or commercial interest.",
    "required": false,
    "type": "textarea",
    "group": "promotion_disclosure",
    "groupTitle": "Promotion & Disclosure",
    "hint": "Used to create a short and natural disclosure when necessary.",
    "help": {
      "what": "Used to create a short and natural disclosure when necessary.",
      "why": "A general relationship category may not provide enough information for an accurate disclosure.",
      "example": "Briefly explain your role, connection, sponsorship, or commercial interest.",
      "avoid": "Avoid vague disclosure or burying a relevant relationship at the end."
    },
    "fullWidth": true,
    "maxLength": 500,
    "showWhen": {
      "anyOf": [
        {
          "key": "relationshipToSubject",
          "notEquals": [
            "No affiliation",
            ""
          ]
        },
        {
          "key": "promotionIntent",
          "notEquals": [
            "No promotion",
            ""
          ]
        }
      ]
    }
  },
  {
    "key": "destinationUrl",
    "label": "Destination URL",
    "placeholder": "https://example.com/resource",
    "required": false,
    "type": "text",
    "group": "promotion_disclosure",
    "groupTitle": "Promotion & Disclosure",
    "hint": "The link will appear only when it is useful and permitted by supplied rules.",
    "help": {
      "what": "The link will appear only when it is useful and permitted by supplied rules.",
      "why": "The model must use the exact destination rather than inventing or guessing a link.",
      "example": "https://example.com/resource",
      "avoid": "Avoid invented links, shorteners, repeated links, or links not permitted by supplied rules."
    },
    "fullWidth": false,
    "format": "url",
    "maxLength": 2048,
    "showWhen": {
      "key": "promotionIntent",
      "notEquals": [
        "No promotion",
        ""
      ]
    }
  },
  {
    "key": "sourceMaterial",
    "label": "Sources or reference material",
    "placeholder": "Paste approved facts, quotations, research notes, source excerpts, or reference links.",
    "required": false,
    "type": "textarea",
    "group": "accuracy_boundaries",
    "groupTitle": "Accuracy & Boundaries",
    "hint": "Only supplied and supportable claims may be presented as verified.",
    "help": {
      "what": "Only supplied and supportable claims may be presented as verified.",
      "why": "Evidence-heavy posts require an approved factual basis without fabricated citations.",
      "example": "Paste approved facts, quotations, research notes, source excerpts, or reference links.",
      "avoid": "Avoid unsupported citations, fabricated research, or source claims not supplied here."
    },
    "fullWidth": true,
    "maxLength": 4000
  },
  {
    "key": "sensitiveDetailsToExclude",
    "label": "Sensitive details to exclude",
    "placeholder": "List names, locations, private data, confidential facts, or identifying details to remove.",
    "required": false,
    "type": "textarea",
    "group": "accuracy_boundaries",
    "groupTitle": "Accuracy & Boundaries",
    "hint": "Use this to protect your privacy and the privacy of other people.",
    "help": {
      "what": "Use this to protect your privacy and the privacy of other people.",
      "why": "Reddit posts can unintentionally expose identifying or confidential information.",
      "example": "List names, locations, private data, confidential facts, or identifying details to remove.",
      "avoid": "Avoid names, addresses, private messages, exact locations, or identifying third-party details."
    },
    "fullWidth": true,
    "maxLength": 1000
  },
  {
    "key": "highStakesArea",
    "label": "High-stakes subject",
    "placeholder": "Choose a regulated or sensitive area when applicable.",
    "required": false,
    "type": "select",
    "group": "accuracy_boundaries",
    "groupTitle": "Accuracy & Boundaries",
    "hint": "Adds appropriate caution without loading a large compliance questionnaire.",
    "help": {
      "what": "Adds appropriate caution without loading a large compliance questionnaire.",
      "why": "High-stakes subjects require more careful claims, qualifications, and jurisdiction handling.",
      "example": "Choose a regulated or sensitive area when applicable.",
      "avoid": "Avoid personalized professional advice, guarantees, diagnosis, or definitive compliance claims."
    },
    "fullWidth": false,
    "options": [
      "None",
      "Health or medical",
      "Legal",
      "Finance or tax",
      "Employment or insurance",
      "Politics or public policy",
      "Child or personal safety",
      "Other regulated topic"
    ],
    "defaultValue": "None"
  },
  {
    "key": "jurisdictionOrScope",
    "label": "Jurisdiction or scope",
    "placeholder": "For example: California, United Kingdom, EU, or general information only",
    "required": false,
    "type": "text",
    "group": "accuracy_boundaries",
    "groupTitle": "Accuracy & Boundaries",
    "hint": "Specify the location or scope that affects the information.",
    "help": {
      "what": "Specify the location or scope that affects the information.",
      "why": "Legal, financial, employment, and other regulated information may vary by jurisdiction.",
      "example": "For example: California, United Kingdom, EU, or general information only",
      "avoid": "Avoid assuming legal, financial, employment, or safety rules are universal."
    },
    "fullWidth": false,
    "maxLength": 200,
    "showWhen": {
      "key": "highStakesArea",
      "notEquals": [
        "None",
        ""
      ]
    }
  },
  {
    "key": "additionalContext",
    "label": "Additional context",
    "placeholder": "Add any remaining requirement that materially affects the post.",
    "required": false,
    "type": "textarea",
    "group": "accuracy_boundaries",
    "groupTitle": "Accuracy & Boundaries",
    "hint": "Use this for important information not covered by another field.",
    "help": {
      "what": "Use this for important information not covered by another field.",
      "why": "It provides one controlled location for relevant edge cases without creating miscellaneous duplicate fields.",
      "example": "Add any remaining requirement that materially affects the post.",
      "avoid": "Avoid conflicting instructions, unsupported claims, or duplicate requirements already covered elsewhere."
    },
    "fullWidth": true,
    "maxLength": 2000
  }
];

function extractVars(prompt) {
  const set = new Set();
  const re = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
  let match;
  while ((match = re.exec(prompt))) set.add(match[1]);
  return [...set];
}

const prompt = fs.readFileSync(promptPath, "utf8");
const promptVars = extractVars(prompt);
const fieldKeys = variables.map((field) => field.key);
const missing = promptVars.filter((key) => !fieldKeys.includes(key));
const extra = fieldKeys.filter((key) => !promptVars.includes(key));

if (missing.length || extra.length) {
  console.error("Reddit Post prompt/form mismatch");
  console.error("Missing fields:", missing.join(", ") || "none");
  console.error("Extra fields:", extra.join(", ") || "none");
  process.exit(1);
}

const payload = {
  slug: "reddit-post",
  title: "Reddit Post",
  version: 2,
  generatedAt: new Date().toISOString(),
  fieldCount: variables.length,
  requiredKeys: variables.filter((field) => field.required).map((field) => field.key),
  groups,
  variables,
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
console.log("Wrote " + outPath + " - " + variables.length + " fields");
