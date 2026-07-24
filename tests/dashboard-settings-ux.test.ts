import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatSignInMethods,
  labelForAuthProvider,
} from "../src/lib/auth/sign-in-methods";

test("formatSignInMethods labels password and OAuth providers for Settings", () => {
  assert.equal(
    formatSignInMethods({ hasPassword: true, oauthProviders: [] }),
    "Email and password",
  );
  assert.equal(
    formatSignInMethods({ hasPassword: false, oauthProviders: ["google"] }),
    "Google",
  );
  assert.equal(
    formatSignInMethods({
      hasPassword: true,
      oauthProviders: ["google", "google"],
    }),
    "Email and password, Google",
  );
  assert.equal(
    formatSignInMethods({ hasPassword: false, oauthProviders: [] }),
    "Not available",
  );
  assert.equal(labelForAuthProvider("credentials"), null);
  assert.equal(labelForAuthProvider("google"), "Google");
});

test("dashboard plan card does not use email as description", () => {
  const source = readFileSync("src/app/(protected)/dashboard/page.tsx", "utf8");

  assert.match(source, /label="Plan"/);
  assert.match(source, /Your current plan|Free plan/);
  assert.match(source, /Open Settings/);
  assert.doesNotMatch(
    source,
    /label="Plan"[\s\S]{0,200}description=\{session\.email\}/,
  );
  assert.match(source, /View pricing/);
  assert.match(source, /Early\s+Access/);
});

test("settings profile hides role for non-admins and includes help contact", () => {
  const settings = readFileSync(
    "src/app/(protected)/settings/page.tsx",
    "utf8",
  );
  const help = readFileSync(
    "src/components/settings/help-contact-card.tsx",
    "utf8",
  );
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8");
  const layout = readFileSync("src/app/(protected)/layout.tsx", "utf8");
  const header = readFileSync("src/components/layout/header.tsx", "utf8");

  assert.match(settings, /showRoleField/);
  assert.match(settings, /formatSignInMethods/);
  assert.match(settings, /HelpContactCard/);
  assert.match(settings, /Sign-in/);
  // Role is only rendered for DB role admin — not always shown to normal users.
  assert.match(
    settings,
    /showRoleField \? \([\s\S]*?Role[\s\S]*?session\.role[\s\S]*?\) : null/,
  );

  assert.match(help, /id="help-contact"/);
  assert.match(help, /siteConfig\.legal\.privacyEmail/);
  assert.match(help, /mailto:/);
  assert.match(help, /\/settings\/support/);
  assert.match(help, /Message support/);

  assert.match(sidebar, /settings#help-contact/);
  assert.match(sidebar, /Help &amp; contact|Help & contact/);

  assert.match(layout, /pb-24/);
  assert.match(layout, /lg:pb-8/);

  // Single account hub name in public header + app sidebar.
  assert.match(header, />\s*Settings\s*</);
  assert.doesNotMatch(header, />\s*Account\s*</);
  assert.match(sidebar, /label: "Settings"/);
});
