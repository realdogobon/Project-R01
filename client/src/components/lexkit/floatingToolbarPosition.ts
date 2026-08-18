export type FloatingToolbarRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export type FloatingToolbarPosition = {
  x: number;
  y: number;
  placement: "above" | "below";
  positionFromRight: boolean;
  edgeInset: number;
};

type FloatingToolbarPositionInput = {
  selectionRect: FloatingToolbarRect;
  viewportWidth: number;
  viewportHeight: number;
  toolbarWidth: number;
  toolbarHeight: number;
  protectedTop?: number;
  offset?: number;
  edgeInset?: number;
};

/**
 * Mirrors LexKit's below-first, viewport-aware floating-toolbar behavior and
 * adds RoyScript's persistent workspace chrome as a protected top boundary.
 */
export function calculateFloatingToolbarPosition({
  selectionRect,
  viewportWidth,
  viewportHeight,
  toolbarWidth,
  toolbarHeight,
  protectedTop = 0,
  offset = 8,
  edgeInset = 10,
}: FloatingToolbarPositionInput): FloatingToolbarPosition {
  const minX = edgeInset;
  const maxX = Math.max(minX, viewportWidth - toolbarWidth - edgeInset);
  const centeredX = selectionRect.left + selectionRect.width / 2 - toolbarWidth / 2;
  const x = Math.min(Math.max(centeredX, minX), maxX);
  const positionFromRight = centeredX > maxX;

  const minimumY = Math.max(edgeInset, protectedTop + edgeInset);
  const maximumY = Math.max(minimumY, viewportHeight - toolbarHeight - edgeInset);
  const belowY = selectionRect.bottom + offset;
  const aboveY = selectionRect.top - toolbarHeight - offset;

  if (belowY <= maximumY) {
    return { x, y: Math.max(belowY, minimumY), placement: "below", positionFromRight, edgeInset };
  }

  if (aboveY >= minimumY) {
    return { x, y: aboveY, placement: "above", positionFromRight, edgeInset };
  }

  // A toolbar taller than the available viewport is rare on desktop, but this
  // clamp still guarantees it does not cover the fixed workspace chrome.
  const preferBelow = Math.abs(belowY - minimumY) <= Math.abs(aboveY - maximumY);
  return {
    x,
    y: preferBelow ? Math.min(Math.max(belowY, minimumY), maximumY) : Math.min(Math.max(aboveY, minimumY), maximumY),
    placement: preferBelow ? "below" : "above",
    positionFromRight,
    edgeInset,
  };
}
