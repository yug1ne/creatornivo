import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
} from "../src/lib/email/send-welcome";

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
  assert.match(text, /Welcome to Creatornivo/i);
  assert.match(text, /Thanks,/);
  assert.match(text, /The Creatornivo team/);
});

test("buildWelcomeEmailText uses a generic greeting without a name", () => {
  const text = buildWelcomeEmailText({
    name: null,
    baseUrl: "https://www.creatornivo.com",
  });

  assert.match(text, /^Hi there,/);
});

test("buildWelcomeEmailHtml is branded HTML with CTAs and key facts", () => {
  const html = buildWelcomeEmailHtml({
    name: "Alex",
    baseUrl: "https://www.creatornivo.com",
  });

  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /Hi Alex,/);
  assert.match(html, /Creatornivo/);
  assert.match(html, /#6366f1/);
  assert.match(html, /Early Access/i);
  assert.match(html, /5 generations per day/i);
  assert.match(html, /generate\?template=linkedin-post/);
  assert.match(html, /\/templates/);
  assert.match(html, /\/dashboard/);
  assert.match(html, /Start with LinkedIn Post/);
  assert.match(html, /Browse templates/);
  assert.match(html, /Open dashboard/);
  assert.match(html, /support@creatornivo\.com/);
  // XSS-safe: raw name characters escaped when present as HTML entities path
  const xss = buildWelcomeEmailHtml({
    name: `<script>alert(1)</script>`,
    baseUrl: "https://www.creatornivo.com",
  });
  assert.doesNotMatch(xss, /<script>alert\(1\)<\/script>/);
  assert.match(xss, /&lt;script&gt;/);
});
