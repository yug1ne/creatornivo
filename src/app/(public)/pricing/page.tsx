import { planLimits, PLANS } from "@/config/plans";
import { isStripeCheckoutConfigured } from "@/config/stripe";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton } from "@/components/pricing/upgrade-button";

const plans = [
  {
    id: PLANS.FREE,
    name: "Free",
    price: "$0",
    description: "Get to know the platform",
    badge: "free" as const,
    highlighted: false,
    features: [
      `Up to ${planLimits.free.maxSavedPrompts} saved prompts`,
      `${planLimits.free.maxGenerationsPerDay} generations per day`,
      "5 basic templates",
      "Demo AI generation",
    ],
  },
  {
    id: PLANS.PRO,
    name: "Pro",
    price: "$9.90/mo",
    description: "For active content creators",
    badge: "pro" as const,
    highlighted: true,
    features: [
      "Unlimited prompts and generations",
      "All templates, including Pro",
      "Priority AI models (GPT-4o)",
      "Content export",
      "Priority support",
    ],
  },
];

export default function PricingPage() {
  const stripeReady = isStripeCheckoutConfigured();

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Pricing
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Start for free and upgrade to Pro when you need more capabilities.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-8 md:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-8 ${
              plan.highlighted
                ? "border-zinc-900 shadow-lg dark:border-zinc-50"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                {plan.name}
              </h2>
              <Badge variant={plan.badge}>{plan.name}</Badge>
            </div>
            <p className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {plan.price}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {plan.description}
            </p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                >
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            {plan.id === PLANS.PRO && (
              <UpgradeButton isConfigured={stripeReady} />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}