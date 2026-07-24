import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { CountBadge } from "@/components/ui/count-badge";
import { siteConfig } from "@/config/site";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

const supportEmail = siteConfig.legal.privacyEmail;

export function HelpContactCard({
  answeredSupportCount = 0,
}: {
  /** Current user's answered threads only (Support replied). */
  answeredSupportCount?: number;
}) {
  return (
    <Card id="help-contact">
      <CardContent className="space-y-3 p-6">
        <div>
          <CardTitle className="text-base">Help &amp; contact</CardTitle>
          <CardDescription className="mt-1">
            Questions about your account, Early Access, or something that is not
            working as expected? Send a message in the app or email us.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/settings/support"
            className={buttonVariants({
              variant: "outline",
              className: "inline-flex w-full items-center gap-2 sm:w-auto",
            })}
          >
            Message support
            <CountBadge
              count={answeredSupportCount}
              tone="success"
              label="support replies waiting"
            />
          </Link>
          {answeredSupportCount > 0 ? (
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              Support replied on {answeredSupportCount} request
              {answeredSupportCount === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>

        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">Email: </span>
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium text-primary break-all hover:underline"
          >
            {supportEmail}
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          In-app support is asynchronous (not live chat). Include the email on
          your account so we can find your workspace quickly.
        </p>
      </CardContent>
    </Card>
  );
}
