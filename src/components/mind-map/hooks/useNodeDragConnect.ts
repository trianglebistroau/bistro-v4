"use client";

import {
  addEdge,
  type Edge,
  type Node,
  type OnNodeDrag,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useRef } from "react";
import { EDGE_MARKER } from "@/components/mind-map/edges/edgeTypes";
import { pickHandles } from "@/utils/mind-map-handles";

const DROP_TARGET_CLASS = "mm-drop-target";

function setNodeHighlight(nodeId: string | null) {
  for (const el of document.querySelectorAll(
    `.react-flow__node.${DROP_TARGET_CLASS}`,
  )) {
    el.classList.remove(DROP_TARGET_CLASS);
  }
  if (nodeId) {
    document
      .querySelector(`.react-flow__node[data-id="${nodeId}"]`)
      ?.classList.add(DROP_TARGET_CLASS);
  }
}

// Returns sceneEdge when both nodes are scenes, labeled edge otherwise.
function buildConnectedEdge(
  source: Node,
  target: Node,
  sourceHandle: string | undefined,
  targetHandle: string | undefined,
): Edge {
  const id = `e-${source.id}-${target.id}`;
  if (source.type === "scene" && target.type === "scene") {
    return { id, source: source.id, target: target.id, sourceHandle, targetHandle, type: "sceneEdge" as const };
  }
  return {
    id,
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle,
    type: "labeled" as const,
    data: { arrowEnd: true },
    markerEnd: EDGE_MARKER,
  };
}

export function useNodeDragConnect({
  setEdges,
}: {
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}): { onNodeDrag: OnNodeDrag; onNodeDragStop: OnNodeDrag } {
  const { getIntersectingNodes, getNodes, getEdges } = useReactFlow();
  const dropTargetRef = useRef<string | null>(null);

  const firstIntersectingId = useCallback(
    (node: Node): string | null => {
      const hit = getIntersectingNodes(node, true).find(
        (n) => n.id !== node.id,
      );
      return hit?.id ?? null;
    },
    [getIntersectingNodes],
  );

  const onNodeDrag: OnNodeDrag = useCallback(
    (_e, node) => {
      const targetId = firstIntersectingId(node);
      if (targetId !== dropTargetRef.current) {
        dropTargetRef.current = targetId;
        setNodeHighlight(targetId);
      }
    },
    [firstIntersectingId],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_e, node) => {
      const targetId = dropTargetRef.current;
      dropTargetRef.current = null;
      setNodeHighlight(null);
      if (!targetId) return;

      const target = getNodes().find((n) => n.id === targetId);
      if (!target) return;

      const alreadyLinked = getEdges().some(
        (e) =>
          (e.source === target.id && e.target === node.id) ||
          (e.source === node.id && e.target === target.id),
      );
      if (alreadyLinked) return;

      const { sourceHandle, targetHandle } = pickHandles(target, node);
      setEdges((eds) =>
        addEdge(buildConnectedEdge(target, node, sourceHandle, targetHandle), eds),
      );
    },
    [getNodes, getEdges, setEdges],
  );

  return { onNodeDrag, onNodeDragStop };
}
