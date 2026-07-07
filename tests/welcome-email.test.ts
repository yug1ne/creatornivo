import assert from "node:assert/strict";
import test from "node:test";

import { buildWelcomeEmailText } from "../src/lib/email/send-welcome";

test("buildWelcomeEmailText includes Early Access, Free limits, and starter CTA", () => {
  const text = buildWelcomeEmailText({
    name: "Alex",
    baseUrl: "https://www.creatornivo.com",
  });

  assert.match(text, /^Hi Alex,/);
  assert.match(text, /Early Access/i);
  assert.match(text, /5 generations per day/i);
  assert.match(text, /\/generate\?template=linkedin-post/);
  assert.match(text, /\/templates/);
  assert.match(text, /\/dashboard/);
  assert.match(text, /support@creatornivo\.com/);
});

test("buildWelcomeEmailText uses a generic greeting without a name", () => {
  const text = buildWelcomeEmailText({
    name: null,
    baseUrl: "https://www.creatornivo.com",
  });

  assert.match(text, /^Hi there,/);
});