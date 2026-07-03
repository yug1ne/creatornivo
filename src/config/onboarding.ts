export const ONBOARDING_STORAGE_KEY = "creatornivo-onboarding-complete";

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
    title: "Your overview and limits",
    description:
      "The dashboard shows generation and save limits for your plan. Keep an eye on them to plan your work.",
    placement: "bottom",
  },
  {
    id: "templates",
    route: "/templates",
    target: '[data-onboarding="templates-grid"]',
    title: "Choose a template",
    description:
      "Templates are ready-made prompts for social media, blogs, email, and marketing. Pick one and start generating.",
    placement: "top",
  },
  {
    id: "generate-picker",
    route: "/generate",
    target: '[data-onboarding="template-picker"]',
    title: "Templates on the generation page",
    description:
      "Quickly switch templates, search by name, and filter by category here.",
    placement: "right",
  },
  {
    id: "generate-flow",
    route: "/generate",
    target: '[data-onboarding="generate-flow"]',
    title: "Content generation",
    description:
      'Fill in the parameters, review the prompt preview, and click "Generate". Results appear in real time.',
    placement: "top",
  },
  {
    id: "library",
    route: "/library",
    target: '[data-onboarding="library-content"]',
    title: "Saving to the library",
    description:
      "After generating, save useful results to the library for search and reuse.",
    placement: "top",
  },
  {
    id: "complete",
    route: "/generate",
    target: null,
    title: "You're all set! Time to create content",
    description:
      "You've completed the Creatornivo tour. Create your first generation now — it only takes a couple of minutes.",
    placement: "center",
  },
];
