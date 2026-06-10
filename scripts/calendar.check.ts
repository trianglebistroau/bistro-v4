// Standalone assertion script for the calendar aggregation helpers.
// Run: npx tsx scripts/calendar.check.ts  (project has no test runner)

import assert from "node:assert/strict";
import type { CreativeScript } from "../src/types/creative";
import type { CalendarEvent } from "../src/types/plan";
import { colorFor, enrich } from "../src/utils/calendar";

const scripts: CreativeScript[] = [
  {
    id: "s-1",
    title: "Manly Beach Girl",
    body: "",
    folderId: "f",
    createdAt: "",
    colorTag: "yellow",
  },
  {
    id: "s-2",
    title: "Stargazing",
    body: "",
    folderId: "f",
    createdAt: "",
    colorTag: "blue",
  },
];

const ev = (scriptId: string, id = "e1"): CalendarEvent => ({
  id,
  scriptId,
  date: "2026-03-18",
  title: "Editing",
  notes: [],
});

// enrich attaches title + colour for a matching folder
{
  const [out] = enrich([ev("s-1")], scripts);
  assert.equal(out.scriptTitle, "Manly Beach Girl", "enrich: title");
  assert.equal(out.colorTag, "yellow", "enrich: colour");
}

// enrich drops orphans (folder deleted)
{
  const out = enrich([ev("zzz")], scripts);
  assert.equal(out.length, 0, "enrich: orphan dropped");
}

// enrich defaults missing colorTag to blue
{
  const noColor: CreativeScript[] = [
    { id: "s-3", title: "X", body: "", folderId: "f", createdAt: "" },
  ];
  const [out] = enrich([ev("s-3")], noColor);
  assert.equal(out.colorTag, "blue", "enrich: default colour");
}

// colorFor known + unknown
{
  assert.ok(colorFor("pink").chip.includes("rose"), "colorFor: pink");
  assert.ok(colorFor("yellow").chip.includes("amber"), "colorFor: yellow");
  assert.deepEqual(colorFor("nope"), colorFor("blue"), "colorFor: default");
  assert.deepEqual(
    colorFor(undefined),
    colorFor("blue"),
    "colorFor: undefined",
  );
}

// empty inputs
{
  assert.deepEqual(enrich([], scripts), [], "enrich: empty events");
  assert.deepEqual(enrich([ev("s-1")], []), [], "enrich: empty scripts");
}

console.log("calendar: all assertions passed");
