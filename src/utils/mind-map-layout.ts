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

// Minimal node-ish shape the hub passes in (position + measured size).
export interface HubBox {
  position: { x: number; y: number };
  width?: number | null;
  height?: number | null;
  measured?: { width?: number; height?: number };
}

/**
 * Lay out `count` leaf positions in an evenly spaced column beside a hub.
 *
 * Clean-spacing rules (ui-ux: spacing-scale / whitespace-balance): one column on
 * the hub's `dir` side, a fixed gap between leaves, the whole stack vertically
 * centred on the hub. Each slot is collision-checked via findFreePosition and
 * pushed into `occupied`, so successive calls (one per category) never overlap.
 */
export function distributeBesideHub(
  hub: HubBox,
  count: number,
  occupied: Rect[],
  opts: {
    dir?: -1 | 1;
    leafW?: number;
    leafH?: number;
    gap?: number;
    offsetX?: number;
  } = {},
): { x: number; y: number }[] {
  if (count <= 0) return [];

  const dir = opts.dir ?? 1;
  const leafW = opts.leafW ?? DEFAULT_W;
  const leafH = opts.leafH ?? DEFAULT_H;
  const gap = opts.gap ?? 16;
  const offsetX = opts.offsetX ?? 240;

  const hubW = hub.width ?? hub.measured?.width ?? 150;
  const hubH = hub.height ?? hub.measured?.height ?? 44;
  const hubCenterY = hub.position.y + hubH / 2;

  // Column x on the hub's side, clear of the hub box.
  const x =
    dir > 0
      ? hub.position.x + hubW + offsetX
      : hub.position.x - offsetX - leafW;

  const step = leafH + gap;
  const totalH = count * leafH + (count - 1) * gap;
  const startY = hubCenterY - totalH / 2;

  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const pos = findFreePosition(
      occupied,
      x,
      startY + i * step,
      dir,
      leafW,
      leafH,
    );
    positions.push(pos);
    occupied.push({ x: pos.x, y: pos.y, w: leafW, h: leafH });
  }
  return positions;
}
