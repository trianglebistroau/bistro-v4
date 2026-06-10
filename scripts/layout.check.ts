// Standalone assertion script for distributeBesideHub.
// Run: npx tsx scripts/layout.check.ts  (project has no test runner)

import assert from "node:assert/strict";
import { distributeBesideHub, type Rect } from "../src/utils/mind-map-layout";

const hub = { position: { x: 1000, y: 300 }, width: 150, height: 44 };
const LEAF_W = 210;
const LEAF_H = 40;
const GAP = 16;
const OFFSET = 240;
const opts = {
  dir: 1 as const,
  leafW: LEAF_W,
  leafH: LEAF_H,
  gap: GAP,
  offsetX: OFFSET,
};

function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
const toRect = (p: { x: number; y: number }): Rect => ({
  x: p.x,
  y: p.y,
  w: LEAF_W,
  h: LEAF_H,
});

// even spacing, same column, centred on hub
{
  const ps = distributeBesideHub(hub, 3, [], opts);
  assert.equal(ps.length, 3, "count 3");
  assert.ok(
    ps.every((p) => p.x === ps[0].x),
    "all same x",
  );
  assert.equal(ps[0].x, 1000 + 150 + OFFSET, "x = hub right + offset");
  assert.equal(ps[1].y - ps[0].y, LEAF_H + GAP, "even gap 0→1");
  assert.equal(ps[2].y - ps[1].y, LEAF_H + GAP, "even gap 1→2");
  const mid = (ps[0].y + ps[2].y + LEAF_H) / 2;
  assert.ok(Math.abs(mid - (300 + 44 / 2)) < 1, "centred on hub centre");
}

// no self-overlap across a larger batch
{
  const ps = distributeBesideHub(hub, 5, [], opts);
  for (let i = 0; i < ps.length; i++) {
    for (let j = i + 1; j < ps.length; j++) {
      assert.ok(
        !overlaps(toRect(ps[i]), toRect(ps[j])),
        `no overlap ${i}/${j}`,
      );
    }
  }
}

// collision with an existing node nudges the slot
{
  const occupied: Rect[] = [
    {
      x: 1000 + 150 + OFFSET,
      y: 300 + 22 - (3 * 40 + 2 * 16) / 2,
      w: 210,
      h: 40,
    },
  ];
  const ps = distributeBesideHub(hub, 3, occupied, opts);
  for (const p of ps) {
    assert.ok(!overlaps(toRect(p), occupied[0]), "nudged off occupied");
  }
}

// left side
{
  const ps = distributeBesideHub(hub, 2, [], { ...opts, dir: -1 });
  assert.ok(
    ps.every((p) => p.x < hub.position.x),
    "left of hub",
  );
}

// empty
{
  assert.deepEqual(distributeBesideHub(hub, 0, [], opts), [], "count 0");
}

console.log("layout: all assertions passed");
