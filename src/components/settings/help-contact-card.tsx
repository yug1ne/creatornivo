import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

const supportEmail = siteConfig.legal.privacyEmail;

export function HelpContactCard() {
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

        <Link
          href="/settings/support"
          className={buttonVariants({ variant: "outline", className: "w-full sm:w-auto" })}
        >
          Message support
        </Link>

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
