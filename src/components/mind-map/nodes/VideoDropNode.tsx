"use client";

import {
  Handle,
  type Node,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import {
  AlertCircle,
  CheckCircle2,
  Film,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCallback, useState } from "react";
import QuickConnectArrows from "@/components/mind-map/canvas/QuickConnectArrows";
import {
  leafNodeStyle,
  MIND_MAP_GROUPS,
} from "@/components/mind-map/constants/topics";
import { EDGE_MARKER } from "@/components/mind-map/edges/edgeTypes";
import { findFreePosition, type Rect, rectOf } from "@/utils/mind-map-layout";
import {
  analyzeVideoMindmap,
  isTikTokUrl,
  type VideoMindmapResult,
} from "@/utils/video-mindmap-service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VideoStatus = "idle" | "analyzing" | "done" | "error";

export type VideoDropData = {
  status: VideoStatus;
  // Persisted form inputs — captured by the canvas autosave (saveCanvas stores
  // node.data) so a reload restores what the user typed.
  tiktokUrl?: string;
  userPrompt?: string;
  note?: string;
  resultCount?: number;
};

export type VideoDropNodeType = Node<VideoDropData, "videoDrop">;

const HANDLE_CLS =
  "!w-2.5 !h-2.5 !rounded-full !border-2 !border-white !bg-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150";

// Which response list feeds which hub.
const HUB_RESULTS: { hubId: string; key: keyof VideoMindmapResult }[] = [
  { hubId: "hub-bigpicture", key: "bigPicture" },
  { hubId: "hub-tone", key: "toneAndMood" },
  { hubId: "hub-audience", key: "targetAudience" },
  { hubId: "hub-composition", key: "composition" },
];

function truncate(text: string, max = 48): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoDropNode({
  id,
  data,
  selected,
}: NodeProps<VideoDropNodeType>) {
  const { updateNodeData, getNode, getNodes, addNodes, addEdges } =
    useReactFlow();

  const status = data.status ?? "idle";
  const [url, setUrl] = useState(data.tiktokUrl ?? "");
  const [prompt, setPrompt] = useState(data.userPrompt ?? "");

  // Drop each analysis result into its hub as a leaf node wired to that hub.
  // Placement is collision-aware (findFreePosition scans real node rects so we
  // never stack on top of existing leaves or other hubs), and we skip any label
  // already present under a hub so re-runs / cache hits don't duplicate.
  const spawnResults = useCallback(
    (result: VideoMindmapResult): number => {
      // Live occupancy map — seeded from every current node, then grown as we
      // place each new leaf so siblings in this batch avoid each other too.
      const occupied: Rect[] = getNodes().map(rectOf);
      // Existing leaf labels per hub, for dedupe.
      const existing = new Map<string, Set<string>>();
      for (const n of getNodes()) {
        const m = /^topic-(hub-[a-z]+)-/.exec(n.id);
        if (!m) continue;
        const label = (n.data as { label?: string }).label ?? "";
        if (!existing.has(m[1])) existing.set(m[1], new Set());
        existing.get(m[1])?.add(label);
      }

      let spawned = 0;
      for (const { hubId, key } of HUB_RESULTS) {
        const group = MIND_MAP_GROUPS.find((g) => g.hubId === hubId);
        const hub = getNode(hubId);
        if (!group || !hub) continue;

        const seen = existing.get(hubId) ?? new Set<string>();
        const baseX = hub.position.x + group.leafDir * 250;
        const baseY = hub.position.y - 40;

        for (const raw of result[key]) {
          const label = truncate(raw);
          if (!label || seen.has(label)) continue;

          const pos = findFreePosition(occupied, baseX, baseY, group.leafDir);
          const nodeId = `topic-${hubId}-${Date.now()}-${spawned}`;
          addNodes({
            id: nodeId,
            type: "default",
            position: pos,
            data: { label },
            style: leafNodeStyle(group.leafBg, group.leafText),
          });
          addEdges({
            id: `e-${nodeId}`,
            source: hubId,
            target: nodeId,
            type: "labeled",
            data: { arrowEnd: true },
            markerEnd: EDGE_MARKER,
          });
          occupied.push({ x: pos.x, y: pos.y, w: 210, h: 40 });
          seen.add(label);
          spawned += 1;
        }
      }
      return spawned;
    },
    [getNode, getNodes, addNodes, addEdges],
  );

  const handleAnalyze = useCallback(async () => {
    const tiktokUrl = url.trim();
    const userPrompt = prompt.trim();
    if (!isTikTokUrl(tiktokUrl)) {
      updateNodeData(id, {
        status: "error",
        note: "Enter a valid TikTok video link.",
        tiktokUrl,
        userPrompt,
      });
      return;
    }
    if (!userPrompt) {
      updateNodeData(id, {
        status: "error",
        note: "Add a prompt describing what to extract.",
        tiktokUrl,
        userPrompt,
      });
      return;
    }

    // Persist inputs + mark in-flight (saved via canvas autosave).
    updateNodeData(id, { status: "analyzing", tiktokUrl, userPrompt });
    try {
      const result = await analyzeVideoMindmap(id, tiktokUrl, userPrompt);
      const count = spawnResults(result);
      updateNodeData(id, {
        status: "done",
        note:
          count > 0
            ? `Added ${count} idea${count === 1 ? "" : "s"} to your hubs.`
            : "These ideas are already on your canvas.",
        resultCount: count,
      });
    } catch (err) {
      updateNodeData(id, {
        status: "error",
        note: err instanceof Error ? err.message : "Analysis failed.",
      });
    }
  }, [id, url, prompt, updateNodeData, spawnResults]);

  const analyzing = status === "analyzing";

  return (
    <div className="group relative w-[280px]">
      <QuickConnectArrows id={id} selected={!!selected} />

      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={HANDLE_CLS}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className={HANDLE_CLS}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={HANDLE_CLS}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className={HANDLE_CLS}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={HANDLE_CLS}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom"
        className={HANDLE_CLS}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={HANDLE_CLS}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className={HANDLE_CLS}
      />

      <div
        className={[
          "rounded-2xl p-4 bg-[#f1f4fb] shadow-sm transition-shadow",
          selected ? "ring-2 ring-[var(--color-primary)]" : "",
        ].join(" ")}
      >
        <div className="flex items-center gap-1.5 mb-3 text-gray-700">
          <Film size={14} />
          <span className="text-sm font-bold">Analyse a video</span>
        </div>

        <div className="nodrag nopan flex flex-col gap-2.5">
          {/* Share-video link — on top */}
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => updateNodeData(id, { tiktokUrl: url.trim() })}
            disabled={analyzing}
            placeholder="Paste a TikTok share link…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />

          {/* User prompt — larger box below */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={() => updateNodeData(id, { userPrompt: prompt })}
            disabled={analyzing}
            rows={4}
            placeholder="What should we pull from this video? e.g. hook ideas, tone, shot list…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
          />

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-70"
          >
            {analyzing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Analysing…
              </>
            ) : status === "error" ? (
              <>
                <Sparkles size={14} />
                Retry
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Analyse video
              </>
            )}
          </button>

          {status === "done" && (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-emerald-600">
              <CheckCircle2 size={13} className="mt-px shrink-0" />
              {data.note}
            </p>
          )}
          {status === "error" && (
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-red-500">
              <AlertCircle size={13} className="mt-px shrink-0" />
              {data.note ?? "Something went wrong."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
