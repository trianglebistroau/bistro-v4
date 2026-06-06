import type { Edge, Node, Viewport } from "@xyflow/react";
import { storage } from "@/utils/storage";

// Mind-map persistence repo.
//
// State is keyed by a `mapId` (the active script id, or "default" when the map
// is opened without one) so each idea keeps its own canvas. Canvas geometry and
// the side panel's custom chips are stored under separate keys because they are
// written by two different components — splitting them avoids one writer
// clobbering the other's value.

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
}

const CANVAS_PREFIX = "bistro_mindmap_canvas_";
const CUSTOM_PREFIX = "bistro_mindmap_custom_";

const canvasKey = (mapId: string) => `${CANVAS_PREFIX}${mapId}`;
const customKey = (mapId: string) => `${CUSTOM_PREFIX}${mapId}`;

// ── Canvas (nodes / edges / viewport) ──────────────────────────────────────

// Returns null when this map has never been saved — caller seeds the defaults.
export function loadCanvas(mapId: string): CanvasState | null {
  return storage.read<CanvasState | null>(canvasKey(mapId), null);
}

export function saveCanvas(mapId: string, state: CanvasState): void {
  storage.write(canvasKey(mapId), state);
}

// ── Side panel custom chips (per section) ──────────────────────────────────

export type CustomItems = Record<string, string[]>;

export function loadCustomItems(mapId: string): CustomItems {
  return storage.read<CustomItems>(customKey(mapId), {});
}

export function saveCustomItems(mapId: string, items: CustomItems): void {
  storage.write(customKey(mapId), items);
}

// Wipe everything for one map (both keys).
export function clearMindMap(mapId: string): void {
  storage.remove(canvasKey(mapId));
  storage.remove(customKey(mapId));
}
