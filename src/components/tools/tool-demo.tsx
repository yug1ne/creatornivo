import { BrowserFrame } from "@/components/landing/browser-frame";
import { Badge } from "@/components/ui/badge";
import {
  getCategoryColor,
  getCategoryIcon,
} from "@/config/template-categories";
import type { PublicTool } from "@/config/public-tools";
import { cn } from "@/lib/utils/cn";

type ResolvedDemoField = {
  key: string;
  label: string;
  value: string;
};

type ToolDemoProps = {
  tool: PublicTool;
  fields: ResolvedDemoField[];
};

export function ToolDemo({ tool, fields }: ToolDemoProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{tool.demoIntro}</p>
      <BrowserFrame
        url={`creatornivo.com/generate?template=${tool.templateSlug}`}
        glow
        className="shadow-xl"
      >
        <div className="flex min-h-[320px] text-left text-[11px] sm:min-h-[360px] sm:text-xs">
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold",
                  getCategoryColor(tool.category),
                )}
                aria-hidden
              >
                {getCategoryIcon(tool.category)}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-foreground sm:text-sm">
                    {tool.templateTitle}
                  </h3>
                  <Badge
                    variant={tool.requiredPlan === "pro" ? "pro" : "free"}
                    className="scale-90"
                  >
                    {tool.requiredPlan === "pro" ? "Pro" : "Free"}
                  </Badge>
                </div>
                <p className="mt-0.5 text-muted-foreground">{tool.platform}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-card p-3">
              <p className="font-medium text-foreground">Template fields</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {fields.map((field) => (
                  <div
                    key={field.key}
                    className={
                      field.value.length > 72 ? "sm:col-span-2" : undefined
                    }
                  >
                    <p className="text-[10px] text-muted-foreground">
                      {field.label}
                    </p>
                    <div className="mt-0.5 break-words rounded-md border border-input bg-background px-2 py-1.5 text-foreground">
                      {field.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
              <p className="font-medium text-foreground">
                {tool.demoOutputLabel}
              </p>
              <pre className="mt-1.5 max-w-full overflow-x-auto whitespace-pre-wrap break-words font-sans text-[11px] leading-relaxed text-foreground/90">
                {tool.demoOutput}
              </pre>
            </div>

            <p className="mt-3 text-[10px] text-muted-foreground">
              Static preview. No API request is made from this page.
            </p>
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}
