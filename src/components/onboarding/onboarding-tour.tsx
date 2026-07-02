"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { ONBOARDING_STEPS } from "@/config/onboarding";
import { buttonVariants } from "@/components/ui/button";
import {
  markOnboardingCompletedLocally,
  isOnboardingCompletedLocally,
} from "@/lib/onboarding/service";
import { cn } from "@/lib/utils/cn";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface OnboardingTourProps {
  userId: string;
}

function waitForElement(
  selector: string,
  timeout = 6000,
): Promise<HTMLElement | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLElement>(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const found = document.querySelector<HTMLElement>(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector<HTMLElement>(selector));
    }, timeout);
  });
}

function getTargetRect(element: HTMLElement | null): Rect | null {
  if (!element) return null;

  const padding = 8;
  const rect = element.getBoundingClientRect();

  return {
    top: Math.max(rect.top - padding, 8),
    left: Math.max(rect.left - padding, 8),
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function OnboardingTour({ userId }: OnboardingTourProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  const step = ONBOARDING_STEPS[stepIndex];
  const isCentered = step?.placement === "center" || !step?.target;
  const isLastStep = stepIndex === ONBOARDING_STEPS.length - 1;
  const forceStart = searchParams.get("onboarding") === "start";

  const completeTour = useCallback(async () => {
    markOnboardingCompletedLocally(userId);

    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // localStorage fallback already set
    }

    setIsActive(false);
    setStepIndex(0);
    setTargetRect(null);

    if (forceStart) {
      const url = new URL(window.location.href);
      url.searchParams.delete("onboarding");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [userId, forceStart, router]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !userId) return;

    if (isOnboardingCompletedLocally(userId)) return;

    async function checkStatus() {
      try {
        const response = await fetch("/api/onboarding/status");
        if (!response.ok) {
          if (forceStart) setIsActive(true);
          return;
        }

        const data = await response.json();
        setIsActive(!data.completed);
      } catch {
        if (forceStart) setIsActive(true);
      }
    }

    checkStatus();
  }, [mounted, userId, forceStart]);

  useEffect(() => {
    if (!isActive || !step) return;

    let cancelled = false;

    async function prepareStep() {
      setIsReady(false);
      setTargetRect(null);

      if (pathname !== step.route) {
        router.push(step.route);
        return;
      }

      if (isCentered) {
        if (!cancelled) setIsReady(true);
        return;
      }

      const element = await waitForElement(step.target!);
      if (cancelled) return;

      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => {
          if (!cancelled) {
            setTargetRect(getTargetRect(element));
            setIsReady(true);
          }
        }, 350);
      } else {
        setIsReady(true);
      }
    }

    prepareStep();

    function handleResize() {
      if (!step.target) return;
      const element = document.querySelector<HTMLElement>(step.target);
      setTargetRect(getTargetRect(element));
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isActive, step, pathname, router, isCentered]);

  async function handleNext() {
    if (isLastStep) {
      await completeTour();
      return;
    }
    setStepIndex((prev) => prev + 1);
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStepIndex((prev) => prev - 1);
    }
  }

  async function handleSkip() {
    await completeTour();
  }

  if (!mounted || !isActive || !step || !isReady) {
    return null;
  }

  const tooltipStyle = (() => {
    if (isCentered || !targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: "24rem",
      } as const;
    }

    const margin = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(360, viewportWidth - 32);

    let top = targetRect.top + targetRect.height + margin;
    let left = targetRect.left;

    if (step.placement === "top") {
      top = targetRect.top - margin;
    }

    if (step.placement === "right") {
      left = targetRect.left + targetRect.width + margin;
      top = targetRect.top;
    }

    if (step.placement === "left") {
      left = targetRect.left - tooltipWidth - margin;
      top = targetRect.top;
    }

    if (top + 200 > viewportHeight) {
      top = Math.max(margin, targetRect.top - 200 - margin);
    }

    left = Math.min(Math.max(margin, left), viewportWidth - tooltipWidth - margin);
    top = Math.min(Math.max(margin, top), viewportHeight - 220);

    return {
      top,
      left,
      maxWidth: tooltipWidth,
      transform:
        step.placement === "top" ? "translateY(-100%)" : undefined,
    };
  })();

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {!isCentered && targetRect ? (
        <div
          className="pointer-events-none absolute rounded-[var(--radius-lg)] ring-2 ring-primary/80 transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      )}

      <div
        className="absolute rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-[var(--shadow-md)] transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
          <div className="flex gap-1">
            {ONBOARDING_STEPS.map((_, index) => (
              <span
                key={ONBOARDING_STEPS[index].id}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  index === stepIndex ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {stepIndex > 0 && !isLastStep && (
              <button
                type="button"
                onClick={handleBack}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Back
              </button>
            )}

            {isLastStep ? (
              <Link
                href="/generate"
                onClick={() => void completeTour()}
                className={buttonVariants({ size: "sm" })}
              >
                Go to generation
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className={buttonVariants({ size: "sm" })}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}