import { BrowserFrame } from "./browser-frame";
import { GenerateMockup } from "./mockups/generate-mockup";
import { ResultMockup } from "./mockups/result-mockup";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-xl pb-16 sm:pb-20 lg:max-w-none lg:pb-0">
      <div
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-accent/40 blur-2xl"
        aria-hidden
      />

      <BrowserFrame
        url="creatornivo.com/generate"
        glow
        className="relative z-10 shadow-2xl"
      >
        <GenerateMockup />
      </BrowserFrame>

      <div className="absolute -bottom-6 -left-4 z-20 hidden w-[55%] sm:block lg:-left-8 lg:w-[48%]">
        <BrowserFrame
          url="creatornivo.com/generate"
          className="shadow-xl ring-1 ring-border"
        >
          <ResultMockup />
        </BrowserFrame>
      </div>

      <div className="absolute -right-2 top-8 z-20 hidden rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg sm:block">
        <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Streaming live
      </div>
    </div>
  );
}