import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("generate route uses structured workspace skeleton", () => {
  const page = readFileSync("src/app/(protected)/generate/page.tsx", "utf8");
  const loading = readFileSync(
    "src/app/(protected)/generate/loading.tsx",
    "utf8",
  );
  const skeleton = readFileSync(
    "src/components/generate/generate-workspace-skeleton.tsx",
    "utf8",
  );

  assert.match(page, /GenerateWorkspaceSkeleton/);
  assert.doesNotMatch(page, /Loading templates/);
  assert.match(loading, /GenerateWorkspaceSkeleton/);
  assert.match(skeleton, /aria-busy="true"/);
  assert.match(skeleton, /Generation quota|Template sidebar|Parameters/i);
});

test("sign out uses modal instead of window.confirm", () => {
  const source = readFileSync("src/components/auth/sign-out-button.tsx", "utf8");

  assert.doesNotMatch(source, /window\.confirm/);
  assert.match(source, /Sign out of Creatornivo\?/);
  assert.match(source, /variant="destructive"/);
});

test("locked pro templates show tooltip and navigate to pricing", () => {
  const source = readFileSync(
    "src/components/generate/template-picker.tsx",
    "utf8",
  );

  assert.match(source, /Pro template – upgrade to unlock/);
  assert.match(source, /LockIcon/);
  assert.match(source, /router\.push\("\/pricing"\)/);
});

test("dashboard upgrade card uses concrete copy", () => {
  const source = readFileSync("src/app/(protected)/dashboard/page.tsx", "utf8");

  assert.match(source, /Need more generations\?/);
  assert.match(source, /100\/month, all templates/);
  assert.doesNotMatch(source, /Unlock full potential/);
});