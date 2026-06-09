import type { Node } from "@xyflow/react";

// Collision-aware placement for spawned mind-map nodes.
//
// New leaves used to be stacked by index (`count * 64`) regardless of where
// existing nodes actually sit, so they overlapped neighbours and other hubs'
// leaves. These helpers find the first free slot near a desired position by
// testing real bounding boxes.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Fallback leaf dimensions when a node hasn't been measured yet.
const DEFAULT_W = 210;
const DEFAULT_H = 40;
// Minimum empty space kept between two boxes.
const GAP = 14;

export function rectOf(node: Node): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.width ?? node.measured?.width ?? DEFAULT_W,
    h: node.height ?? node.measured?.height ?? DEFAULT_H,
  };
}

function intersects(a: Rect, b: Rect, gap = GAP): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

/**
 * Find a free top-left position near (baseX, baseY) for a box of size (w, h).
 *
 * Scans column by column (stepping outward along `dirX`, so leaves stay on the
 * hub's side), and within each column scans rows outward from the base row
 * (0, +1, -1, +2, …). Returns the first candidate that clears every rect in
 * `occupied`. Falls back to the base position if nothing is free within range.
 */
export function findFreePosition(
  occupied: Rect[],
  baseX: number,
  baseY: number,
  dirX: -1 | 1,
  w = DEFAULT_W,
  h = DEFAULT_H,
): { x: number; y: number } {
  const colStep = (w + 40) * dirX;
  const rowStep = h + GAP;

  for (let col = 0; col < 6; col++) {
    const x = baseX + col * colStep;
    for (let row = 0; row < 14; row++) {
      const dy =
        row === 0
          ? 0
          : (row % 2 === 1 ? Math.ceil(row / 2) : -Math.ceil(row / 2)) *
            rowStep;
      const candidate: Rect = { x, y: baseY + dy, w, h };
      if (!occupied.some((r) => intersects(candidate, r))) {
        return { x: candidate.x, y: candidate.y };
      }
    }
  }
  return { x: baseX, y: baseY };
}
