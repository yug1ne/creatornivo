export const ONBOARDING_STORAGE_KEY = "creatornivo-onboarding-complete";

/** Default template for new-user activation CTAs (must match seed slug). */
export const ONBOARDING_STARTER_TEMPLATE_SLUG = "linkedin-post";

export function getOnboardingStarterGenerateUrl(): string {
  return `/generate?template=${ONBOARDING_STARTER_TEMPLATE_SLUG}`;
}

export interface OnboardingStep {
  id: string;
  route: string;
  target: string | null;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "dashboard",
    route: "/dashboard",
    target: '[data-onboarding="dashboard-stats"]',
    title: "Start here",
    description:
      "Track your generation quota and saved prompts. Your recent saves will show up below once you create content.",
    placement: "bottom",
  },
  {
    id: "templates",
    route: "/templates",
    target: '[data-onboarding="templates-grid"]',
    title: "Browse templates",
    description:
      "Each template is a proven prompt structure for social posts, blogs, email, and more. Pick one that fits your task.",
    placement: "top",
  },
  {
    id: "generate-picker",
    route: "/generate",
    target: '[data-onboarding="template-picker"]',
    title: "Choose a template",
    description:
      "On Generate, pick a template from the sidebar. Search and filter by category to find the right starting point.",
    placement: "right",
  },
  {
    id: "generate-flow",
    route: "/generate",
    target: '[data-onboarding="generate-flow"]',
    title: "Generate your draft",
    description:
      'Add your topic and tone, review the prompt preview, then click "Generate". Content streams in real time below.',
    placement: "top",
  },
  {
    id: "generate-save",
    route: "/generate",
    target: null,
    title: "Save what you create",
    description:
      'When generation finishes, click "Save" on the result card. Only saved drafts appear in your library — nothing is stored automatically.',
    placement: "center",
  },
  {
    id: "library",
    route: "/library",
    target: '[data-onboarding="library-content"]',
    title: "Your content library",
    description:
      "Saved generations land here for search and reuse. It's empty until your first save — generate something, hit Save, and it will show up.",
    placement: "top",
  },
  {
    id: "complete",
    route: "/generate",
    target: null,
    title: "Ready to create",
    description:
      "You're set. LinkedIn Post is a great first template — add a topic, generate, and save your draft to the library.",
    placement: "center",
  },
];
