"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  getOnboardingStarterGenerateUrl,
  ONBOARDING_STEPS,
} from "@/config/onboarding";
import { buttonVariants } from "@/components/ui/button";
import {
  markOnboardingCompletedLocally,
  isOnboardingCompletedLocally,
} from "@/lib/onboarding/service";
import {
  calculateTourPosition,
  type TourPosition,
} from "@/lib/onboarding/positioning";
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
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function getFixedHeaderHeight(): number {
  const header = document.querySelector<HTMLElement>("header");
  if (!header) return 0;
  const position = window.getComputedStyle(header).position;
  if (position !== "fixed" && position !== "sticky") return 0;
  const rect = header.getBoundingClientRect();
  return rect.top <= 0 && rect.bottom > 0 ? rect.bottom : 0;
}

function waitForScrollToSettle(timeout = 900): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let stableSince = startedAt;
    let previousX = window.scrollX;
    let previousY = window.scrollY;

    function check(now: number) {
      if (window.scrollX !== previousX || window.scrollY !== previousY) {
        previousX = window.scrollX;
        previousY = window.scrollY;
        stableSince = now;
      }
      if (now - stableSince >= 120 || now - startedAt >= timeout) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    }

    requestAnimationFrame(check);
  });
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
  const [tooltipPosition, setTooltipPosition] =
    useState<TourPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    // The portal can only render after the client document exists.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
        element.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "smooth",
        });
        await waitForScrollToSettle();
        if (!cancelled) {
          setTargetRect(getTargetRect(element));
          setIsReady(true);
        }
      } else {
        setIsReady(true);
      }
    }

    prepareStep();

    return () => {
      cancelled = true;
    };
  }, [isActive, step, pathname, router, isCentered]);

  const recalculatePosition = useCallback(() => {
    if (!step) return;
    const element = step.target
      ? document.querySelector<HTMLElement>(step.target)
      : null;
    const nextTargetRect = isCentered ? null : getTargetRect(element);
    const popupRect = tooltipRef.current?.getBoundingClientRect();
    const position = calculateTourPosition({
      target: nextTargetRect,
      popup: {
        width: popupRect?.width ?? Math.min(360, window.innerWidth - 32),
        height: popupRect?.height ?? 240,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      preferredPlacement: step.placement ?? "bottom",
      headerHeight: getFixedHeaderHeight(),
    });
    setTargetRect(nextTargetRect);
    setTooltipPosition(position);
  }, [isCentered, step]);

  useEffect(() => {
    if (!isReady || !isActive) return;
    const frame = requestAnimationFrame(recalculatePosition);
    const popup = tooltipRef.current;
    const target = step.target
      ? document.querySelector<HTMLElement>(step.target)
      : null;
    const observer = new ResizeObserver(recalculatePosition);
    if (popup) observer.observe(popup);
    if (target) observer.observe(target);
    window.addEventListener("resize", recalculatePosition);
    window.addEventListener("scroll", recalculatePosition, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", recalculatePosition);
      window.removeEventListener("scroll", recalculatePosition, true);
    };
  }, [isActive, isReady, recalculatePosition, step.target]);

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

  const tooltipStyle = tooltipPosition
    ? {
        top: tooltipPosition.top,
        left: tooltipPosition.left,
        width: tooltipPosition.width,
        maxHeight: tooltipPosition.maxHeight,
      }
    : { visibility: "hidden" as const };

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
        ref={tooltipRef}
        className="fixed flex max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-[var(--shadow-md)] transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="min-h-0 overflow-y-auto">
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
        </div>

        <div className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-3">
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
                href={getOnboardingStarterGenerateUrl()}
                onClick={() => void completeTour()}
                className={buttonVariants({ size: "sm" })}
              >
                Start with LinkedIn Post
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
