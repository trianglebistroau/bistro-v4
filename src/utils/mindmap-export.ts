import type { Edge, Node, Viewport } from "@xyflow/react";
import type { ShapeData } from "@/components/mind-map/nodes/ShapeNode";
import type { StickyData } from "@/components/mind-map/nodes/StickyNode";
import type { TextBoxData } from "@/components/mind-map/nodes/TextBoxNode";
import { getScripts } from "@/utils/creative";

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function nodeContent(node: Node): string {
  switch (node.type) {
    case "sticky":
      return (node.data as StickyData).text;
    case "textbox":
      return (node.data as TextBoxData).html.replace(/<[^>]+>/g, "");
    case "shape":
      return (node.data as ShapeData).text;
    default:
      return (node.data as { label?: string }).label ?? "";
  }
}

// ── Export 1: Standard (reimportable) ──────────────────────────────────────

export function exportMindMapJSON(
  nodes: Node[],
  edges: Edge[],
  viewport?: Viewport,
) {
  downloadJSON(`mindmap-${Date.now()}.json`, {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
    nodes,
    edges,
  });
}

// ── Scene-oriented AI graph ─────────────────────────────────────────────────

export interface SceneTopic {
  hubLabel: string;
  items: string[];
}

export interface VideoInspiration {
  videoId: string;
  insights: string[];
}

export interface SceneExport {
  id: string;
  label: string;
  order: number;
  /** Topic hubs directly connected to this scene (e.g. Scene Description). */
  topics: SceneTopic[];
  /** Video analysis nodes connected to this scene, with their insight leaves. */
  videoInspirations: VideoInspiration[];
  /** Loose notes directly connected to this scene with no sub-structure. */
  notes: string[];
}

export interface MindMapGraph {
  exportedAt: string;
  project: {
    name: string;
    goal: string;
    platform: string;
  };
  /** Scenes in chain order (derived from sceneEdge sequence). */
  scenes: SceneExport[];
  /** Nodes not reachable from any scene. */
  globalNotes: string[];
}

function buildMindMapGraph(
  nodes: Node[],
  edges: Edge[],
  scriptId?: string,
): MindMapGraph {
  // Project info from the active script (if any).
  const script = scriptId ? getScripts().find((s) => s.id === scriptId) : null;
  const project = {
    name: script?.title ?? "Untitled",
    goal: script?.goal ?? "",
    platform: script?.platform ?? "",
  };

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const contentOf = (id: string) => {
    const n = nodeById.get(id);
    return n ? nodeContent(n) : "";
  };

  // Build outgoing and incoming edge maps; track sceneEdge targets.
  const outEdges = new Map<string, string[]>();
  const inEdges = new Map<string, string[]>();
  const sceneEdgeTargets = new Set<string>();

  for (const edge of edges) {
    const out = outEdges.get(edge.source) ?? [];
    out.push(edge.target);
    outEdges.set(edge.source, out);

    const inc = inEdges.get(edge.target) ?? [];
    inc.push(edge.source);
    inEdges.set(edge.target, inc);

    if (edge.type === "sceneEdge") sceneEdgeTargets.add(edge.target);
  }

  // Collect all scene nodes and build the sceneEdge forward-walk map.
  const sceneIds = nodes.filter((n) => n.type === "scene").map((n) => n.id);
  const sceneSet = new Set(sceneIds);

  const sceneNext = new Map<string, string>();
  for (const edge of edges) {
    if (
      edge.type === "sceneEdge" &&
      sceneSet.has(edge.source) &&
      sceneSet.has(edge.target)
    ) {
      sceneNext.set(edge.source, edge.target);
    }
  }

  // Walk chains from roots (scenes not targeted by any sceneEdge).
  const orderedSceneIds: string[] = [];
  const visited = new Set<string>();

  for (const rootId of sceneIds.filter((id) => !sceneEdgeTargets.has(id))) {
    let cur: string | undefined = rootId;
    while (cur && !visited.has(cur)) {
      if (sceneSet.has(cur)) {
        orderedSceneIds.push(cur);
        visited.add(cur);
      }
      cur = sceneNext.get(cur);
    }
  }

  // Append any disconnected scene nodes not reached by any chain.
  for (const id of sceneIds) {
    if (!visited.has(id)) orderedSceneIds.push(id);
  }

  // Build each scene's content by traversing both outgoing and incoming edges.
  // Incoming edges cover "node → scene" connections the user drew manually.
  // A node shared across multiple scenes appears under each of them.
  const claimedIds = new Set<string>(sceneSet);

  const scenes: SceneExport[] = orderedSceneIds.map((sceneId, idx) => {
    const topics: SceneTopic[] = [];
    const videoInspirations: VideoInspiration[] = [];
    const notes: string[] = [];

    // Merge outgoing targets + incoming sources, deduplicated.
    const neighborIds = new Set([
      ...(outEdges.get(sceneId) ?? []),
      ...(inEdges.get(sceneId) ?? []),
    ]);

    for (const targetId of neighborIds) {
      if (sceneSet.has(targetId)) continue; // skip scene-to-scene links
      const target = nodeById.get(targetId);
      if (!target) continue;
      claimedIds.add(targetId);

      if (target.type === "videoDrop") {
        const insightIds = outEdges.get(targetId) ?? [];
        const insights = insightIds
          .map((id) => {
            claimedIds.add(id);
            return contentOf(id);
          })
          .filter(Boolean);
        if (insights.length > 0) {
          videoInspirations.push({ videoId: targetId, insights });
        }
      } else {
        // Nodes with outgoing edges = topic hub (e.g. Scene Description).
        const leafIds = (outEdges.get(targetId) ?? []).filter(
          (id) => !sceneSet.has(id),
        );
        if (leafIds.length > 0) {
          const items = leafIds
            .map((id) => {
              claimedIds.add(id);
              return contentOf(id);
            })
            .filter(Boolean);
          topics.push({ hubLabel: contentOf(targetId), items });
        } else {
          notes.push(contentOf(targetId));
        }
      }
    }

    return {
      id: sceneId,
      label: contentOf(sceneId),
      order: idx + 1,
      topics,
      videoInspirations,
      notes,
    };
  });

  // Anything not reachable from a scene.
  const globalNotes = nodes
    .filter((n) => !claimedIds.has(n.id) && n.type !== "videoDrop")
    .map((n) => nodeContent(n))
    .filter(Boolean);

  return {
    exportedAt: new Date().toISOString(),
    project,
    scenes,
    globalNotes,
  };
}

// ── Export 2: Backend payload (sent to /api/v1/summary) ─────────────────────
export function exportMindMapGraph(
  nodes: Node[],
  edges: Edge[],
  scriptId?: string,
): MindMapGraph {
  return buildMindMapGraph(nodes, edges, scriptId);
}

// ── Export 3: Downloadable AI context file ───────────────────────────────────
export function exportMindMapForAI(
  nodes: Node[],
  edges: Edge[],
  scriptId?: string,
) {
  downloadJSON(
    `mindmap-ai-${Date.now()}.json`,
    buildMindMapGraph(nodes, edges, scriptId),
  );
}
