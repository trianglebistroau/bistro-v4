"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";

// Default mind-map node — the central idea, the four hubs, and every spawned
// topic leaf use this (registered as nodeTypes.default). It renders the label
// and a source+target handle on EACH side with stable ids ("top" | "right" |
// "bottom" | "left") so an edge can attach to a chosen side at creation time
// (see utils/mind-map-handles.ts). React Flow applies the node's `style`
// (leaf/hub/idea palette) to the wrapper; this component only renders content.

const SIDES = [
  Position.Top,
  Position.Right,
  Position.Bottom,
  Position.Left,
] as const;

const SIDE_ID: Record<Position, string> = {
  [Position.Top]: "top",
  [Position.Right]: "right",
  [Position.Bottom]: "bottom",
  [Position.Left]: "left",
};

const HANDLE_CLS =
  "!h-2 !w-2 !border !border-white !bg-gray-400 !opacity-0 transition-opacity hover:!opacity-100";

export default function TopicNode({ data }: NodeProps) {
  const label = (data as { label?: string }).label ?? "";
  return (
    <>
      {SIDES.map((pos) => (
        <Handle
          key={`s-${pos}`}
          type="source"
          id={SIDE_ID[pos]}
          position={pos}
          className={HANDLE_CLS}
        />
      ))}
      {SIDES.map((pos) => (
        <Handle
          key={`t-${pos}`}
          type="target"
          id={SIDE_ID[pos]}
          position={pos}
          className={HANDLE_CLS}
        />
      ))}

      {/* Back-compat: legacy edges saved without a handle id attach to these
          null-id handles (matches the old built-in default node). */}
      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />

      <span>{label}</span>
    </>
  );
}
