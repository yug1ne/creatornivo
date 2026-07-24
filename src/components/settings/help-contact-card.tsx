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
            working as expected? Email us and we will get back to you.
          </CardDescription>
        </div>
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">Support: </span>
          <a
            href={`mailto:${supportEmail}`}
            className="font-medium text-primary break-all hover:underline"
          >
            {supportEmail}
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Include the email on your account so we can find your workspace
          quickly. We do not offer live chat yet.
        </p>
      </CardContent>
    </Card>
  );
}
