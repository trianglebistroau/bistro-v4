import type { Edge, Node, Viewport } from "@xyflow/react";

// The whole mind-map graph for one idea, persisted as a single jsonb blob on
// `folders.canvas`. Same shape the app previously kept in localStorage.
export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
}
