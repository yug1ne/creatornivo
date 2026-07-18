"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

import { BrowserFrame } from "./browser-frame";
import { DashboardMockup } from "./mockups/dashboard-mockup";
import { GenerateMockup } from "./mockups/generate-mockup";
import { LibraryMockup } from "./mockups/library-mockup";
import { ResultMockup } from "./mockups/result-mockup";

const screenshots = [
  {
    id: "generate",
    label: "Generate",
    title: "Template picker + parameters",
    description:
      "Choose a predefined business template, fill topic and tone, and create an AI-assisted draft. Structured inputs are assembled securely on the server.",
    url: "creatornivo.com/generate",
    Mockup: GenerateMockup,
  },
  {
    id: "result",
    label: "Result",
    title: "AI-assisted draft in progress",
    description:
      "Watch a structured text draft stream in. Review it, edit it, then copy, save to your library, or export on Pro.",
    url: "creatornivo.com/generate",
    Mockup: ResultMockup,
  },
  {
    id: "library",
    label: "Library",
    title: "Your content library",
    description:
      "Search, filter, and revisit every piece you've saved. Never lose a great draft again.",
    url: "creatornivo.com/library",
    Mockup: LibraryMockup,
  },
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Limits at a glance",
    description:
      "Track usage at a glance: Free includes 5 AI-assisted drafts per day; Pro includes 100 per month.",
    url: "creatornivo.com/dashboard",
    Mockup: DashboardMockup,
  },
] as const;

export function ProductScreenshots() {
  const [active, setActive] = useState<(typeof screenshots)[number]["id"]>(
    "generate",
  );

  const current = screenshots.find((s) => s.id === active) ?? screenshots[0];
  const Mockup = current.Mockup;

  return (
    <div className="mt-16">
      <div className="flex flex-wrap justify-center gap-2">
        {screenshots.map((shot) => (
          <button
            key={shot.id}
            type="button"
            onClick={() => setActive(shot.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-all",
              active === shot.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {shot.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
        <div className="text-center lg:text-left">
          <p className="text-sm font-medium text-primary">{current.label}</p>
          <h3 className="mt-2 text-2xl font-bold text-foreground">
            {current.title}
          </h3>
          <p className="mt-3 text-muted-foreground">{current.description}</p>
        </div>

        <BrowserFrame url={current.url} glow className="shadow-2xl">
          <Mockup />
        </BrowserFrame>
      </div>
    </div>
  );
}
