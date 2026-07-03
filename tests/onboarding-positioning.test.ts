import assert from "node:assert/strict";
import test from "node:test";

import { ONBOARDING_STEPS } from "../src/config/onboarding";
import { calculateTourPosition } from "../src/lib/onboarding/positioning";

function assertInsideViewport(
  position: ReturnType<typeof calculateTourPosition>,
  viewport: { width: number; height: number },
  popupHeight: number,
  headerHeight = 0,
) {
  const renderedHeight = Math.min(popupHeight, position.maxHeight);
  assert.ok(position.top >= headerHeight + 12);
  assert.ok(position.left >= 12);
  assert.ok(position.left + position.width <= viewport.width - 12);
  assert.ok(position.top + renderedHeight <= viewport.height - 12);
}

test("step 2 popup flips below and remains fully visible", () => {
  const viewport = { width: 1366, height: 768 };
  const position = calculateTourPosition({
    target: { top: 72, left: 280, width: 900, height: 180 },
    popup: { width: 360, height: 230 },
    viewport,
    preferredPlacement: "top",
    headerHeight: 64,
  });
  assert.equal(position.placement, "bottom");
  assertInsideViewport(position, viewport, 230, 64);
});

test("step 5 popup remains visible in a short scrolled viewport", () => {
  const viewport = { width: 1280, height: 720 };
  const position = calculateTourPosition({
    target: { top: 48, left: 250, width: 850, height: 240 },
    popup: { width: 360, height: 260 },
    viewport,
    preferredPlacement: "top",
    headerHeight: 64,
  });
  assertInsideViewport(position, viewport, 260, 64);
});

test("popup is clamped on mobile and never leaves right or bottom edges", () => {
  const viewport = { width: 375, height: 667 };
  const position = calculateTourPosition({
    target: { top: 500, left: 310, width: 60, height: 90 },
    popup: { width: 360, height: 300 },
    viewport,
    preferredPlacement: "right",
    headerHeight: 64,
  });
  assertInsideViewport(position, viewport, 300, 64);
});

test("fixed header contributes to the safe top boundary", () => {
  const position = calculateTourPosition({
    target: { top: 20, left: 100, width: 200, height: 80 },
    popup: { width: 360, height: 240 },
    viewport: { width: 1920, height: 1080 },
    preferredPlacement: "top",
    headerHeight: 64,
  });
  assert.ok(position.top >= 80);
});

test("placement flips from bottom to top when lower space is insufficient", () => {
  const position = calculateTourPosition({
    target: { top: 650, left: 400, width: 300, height: 80 },
    popup: { width: 360, height: 220 },
    viewport: { width: 1366, height: 768 },
    preferredPlacement: "bottom",
  });
  assert.equal(position.placement, "top");
  assert.ok(position.top >= 12);
});

test("all six tour steps stay inside supported viewports at 100% and 125% zoom", () => {
  const viewports = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
    { width: 375, height: 667 },
    { width: 1093, height: 614 }, // 1366x768 effective CSS viewport at 125%.
  ];

  for (const viewport of viewports) {
    ONBOARDING_STEPS.forEach((step, index) => {
      const target =
        step.target === null
          ? null
          : {
              top: index === 1 || index === 4 ? 70 : viewport.height / 2 - 60,
              left: viewport.width / 2 - Math.min(300, viewport.width / 3),
              width: Math.min(600, viewport.width * 0.6),
              height: 120,
            };
      const position = calculateTourPosition({
        target,
        popup: { width: 360, height: 260 },
        viewport,
        preferredPlacement: step.placement ?? "bottom",
        headerHeight: 64,
      });

      assertInsideViewport(position, viewport, 260, 64);
    });
  }
});
