export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface TourRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TourPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: TourPlacement;
}

const DEFAULT_MARGIN = 16;
const TARGET_GAP = 16;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function calculateTourPosition(input: {
  target: TourRect | null;
  popup: { width: number; height: number };
  viewport: { width: number; height: number };
  preferredPlacement: TourPlacement;
  headerHeight?: number;
  margin?: number;
}): TourPosition {
  const margin = Math.max(12, input.margin ?? DEFAULT_MARGIN);
  const safeTop = Math.max(margin, (input.headerHeight ?? 0) + margin);
  const safeBottom = input.viewport.height - margin;
  const width = Math.min(
    input.popup.width,
    Math.max(0, input.viewport.width - margin * 2),
  );
  const maxHeight = Math.max(0, safeBottom - safeTop);
  const height = Math.min(input.popup.height, maxHeight);

  if (!input.target || input.preferredPlacement === "center") {
    return {
      top: safeTop + Math.max(0, (maxHeight - height) / 2),
      left: Math.max(margin, (input.viewport.width - width) / 2),
      width,
      maxHeight,
      placement: "center",
    };
  }

  const target = input.target;
  const candidates: Record<Exclude<TourPlacement, "center">, TourPosition> = {
    top: {
      top: target.top - TARGET_GAP - height,
      left: target.left + (target.width - width) / 2,
      width,
      maxHeight,
      placement: "top",
    },
    bottom: {
      top: target.top + target.height + TARGET_GAP,
      left: target.left + (target.width - width) / 2,
      width,
      maxHeight,
      placement: "bottom",
    },
    right: {
      top: target.top + (target.height - height) / 2,
      left: target.left + target.width + TARGET_GAP,
      width,
      maxHeight,
      placement: "right",
    },
    left: {
      top: target.top + (target.height - height) / 2,
      left: target.left - TARGET_GAP - width,
      width,
      maxHeight,
      placement: "left",
    },
  };
  const opposite = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  } as const;
  const preferred = input.preferredPlacement;
  const order = [
    preferred,
    opposite[preferred],
    preferred === "top" || preferred === "bottom" ? "right" : "bottom",
    preferred === "top" || preferred === "bottom" ? "left" : "top",
  ] as const;
  const fits = (position: TourPosition) =>
    position.top >= safeTop &&
    position.left >= margin &&
    position.top + height <= safeBottom &&
    position.left + width <= input.viewport.width - margin;
  const selected =
    order.map((placement) => candidates[placement]).find(fits) ??
    candidates[preferred];

  return {
    ...selected,
    top: clamp(selected.top, safeTop, safeBottom - height),
    left: clamp(
      selected.left,
      margin,
      input.viewport.width - margin - width,
    ),
  };
}
