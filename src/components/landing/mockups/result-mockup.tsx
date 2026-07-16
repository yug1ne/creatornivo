export function ResultMockup() {
  return (
    <div className="p-4 text-left sm:p-5">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-foreground sm:text-sm">
            Result
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            GPT-5.6
          </p>
        </div>
        <div className="flex gap-1.5">
          <span className="rounded-md border border-border px-2 py-1 text-[10px]">
            Copy
          </span>
          <span className="rounded-md bg-primary px-2 py-1 text-[10px] text-primary-foreground">
            Save
          </span>
        </div>
      </div>
      <div className="space-y-3 p-4 text-xs leading-relaxed text-foreground/90 sm:text-sm">
        <p className="font-semibold text-foreground">
          I spent 6 months building in public.
        </p>
        <p>
          Here&apos;s what nobody tells you about launching a SaaS as a solo
          founder:
        </p>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          <li>Your MVP will feel embarrassing. Ship it anyway.</li>
          <li>Distribution beats features for the first 90 days.</li>
          <li>Comments on LinkedIn beat likes for B2B.</li>
        </ul>
        <p className="text-muted-foreground">
          What&apos;s the hardest lesson you learned after launch?
        </p>
      </div>
    </div>
  );
}