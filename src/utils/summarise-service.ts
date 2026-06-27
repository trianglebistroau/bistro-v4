import {
  deleteSummary,
  fetchSummaryRow,
  saveGraph,
  saveResult,
  setSummaryStatus,
} from "@/lib/db/actions/summary";
import type { SummariseStatus } from "@/lib/db/schema/summaries";
import type { ConceptMeta, ShotData, SummariseResult } from "@/types/summarise";
import type { MindMapGraph } from "@/utils/mindmap-export";

// Re-exported for back-compat: callers historically imported the result type
// from here. It now lives in @/types/summarise.
export type { SummariseResult } from "@/types/summarise";

// One scene in the backend storyboard breakdown.
interface SceneApiResponse {
  scene: string;
  description: string;
  visual: string;
  audio: string;
  script: string;
}

// Shape returned by `POST /api/v1/summary`.
// The endpoint returns only `scenes`; it no longer carries concept/tone/
// audience meta. ConceptMeta is sourced elsewhere (see utils/plan.ts).
interface SummaryApiResponse {
  scenes: SceneApiResponse[];
}

// Same-origin Next.js route handler that proxies to the backend server-side.
// The real backend URL (API_URL) never reaches the browser.
const SUMMARY_ENDPOINT = "/api/v1/summary";
// Gemini summary + Cloud Run cold start can take well over a minute — keep this
// comfortably under the Cloud Run request limit (300s) but long enough not to
// abort a healthy-but-slow call.
const REQUEST_TIMEOUT_MS = 150000;
// One automatic retry smooths over cold starts and transient network blips.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

// ── Per-idea client-side state ──────────────────────────────────────────────
// Persistence lives in the DB (summaries row). These in-memory maps, keyed by
// the idea's clientId, hold only this session's transient state:
//   • statusCache — the SYNC snapshot source for `useSyncExternalStore`; the
//     sidebar gate can't await, so status is mirrored here and refreshed from
//     the DB on mount (loadSummaryStatus) and on every job transition.
//   • pendingMap  — the request in flight this session, so a same-session
//     revisit of the summarise page reuses it instead of re-issuing.
const statusCache = new Map<string, SummariseStatus | null>();
const pendingMap = new Map<string, Promise<SummariseResult>>();
const statusListeners = new Set<() => void>();

function notify(): void {
  for (const cb of statusListeners) cb();
}

function setStatusCache(
  clientId: string,
  status: SummariseStatus | null,
): void {
  statusCache.set(clientId, status);
  notify();
}

// ── Status accessor + change subscription (sidebar gate) ────────────────────

export function getSummaryStatus(clientId: string): SummariseStatus | null {
  return statusCache.get(clientId) ?? null;
}

export function subscribeSummaryStatus(cb: () => void): () => void {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

// Pull the persisted status into the cache (call from an effect). Lets the
// sync `useSyncExternalStore` gate reflect a status that only the DB knows
// about (e.g. after a fresh page load).
export async function loadSummaryStatus(clientId: string): Promise<void> {
  const row = await fetchSummaryRow(clientId);
  setStatusCache(clientId, row?.status ?? null);
}

// ── scenes → shot rows ─────────────────────────────────────────────────────
// The endpoint returns structured scenes. Map each onto a ShotData row:
//   visual → shootingStyle (there is no separate `time` field anymore).
// `script` is a single string backend-side, so wrap it for the table's
// line-per-entry rendering (split on newlines when present).
function sceneToRow(scene: SceneApiResponse, i: number): ShotData {
  const lines = scene.script
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    shotNumber: i + 1,
    time: undefined,
    description: scene.description,
    shootingStyle: scene.visual || "—",
    audio: scene.audio || "—",
    script: lines.length > 0 ? lines : [scene.script],
  };
}

// The /summary endpoint no longer returns concept/tone/audience, so meta is
// left blank here — the consumers that need it read from their own store.
function mapResponse(res: SummaryApiResponse): SummariseResult {
  const meta: ConceptMeta = { projectName: "Your Idea" };
  return {
    meta,
    shots: (res.scenes ?? []).map(sceneToRow),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 4xx (except 408/429) are caller errors — retrying won't help.
function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function attemptSummary(graph: MindMapGraph): Promise<SummariseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(SUMMARY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ graph: JSON.stringify(graph) }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const err = new Error(`summary failed (${res.status}): ${detail}`);
      // Tag so the retry loop knows whether to bother.
      (err as Error & { retryable?: boolean }).retryable = isRetryable(
        res.status,
      );
      throw err;
    }
    const json = (await res.json()) as SummaryApiResponse;
    return mapResponse(json);
  } catch (err) {
    // Our own timeout surfaces as an AbortError — relabel it clearly.
    if (err instanceof DOMException && err.name === "AbortError") {
      const e = new Error("The summary took too long to generate.");
      (e as Error & { retryable?: boolean }).retryable = true;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSummary(graph: MindMapGraph): Promise<SummariseResult> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await attemptSummary(graph);
    } catch (err) {
      lastErr = err;
      const retryable =
        (err as Error & { retryable?: boolean }).retryable ?? true; // network errors have no flag → retry
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("summary request failed");
}

// Kick off the request and persist its lifecycle to the DB so a reload resumes:
//   • persistGraph=true snapshots the graph + marks pending (a fresh submit);
//     resume re-runs with persistGraph=false (the graph is already stored).
function startJob(
  clientId: string,
  graph: MindMapGraph,
  persistGraph: boolean,
): Promise<SummariseResult> {
  setStatusCache(clientId, "pending");
  const p = (persistGraph ? saveGraph(clientId, graph) : Promise.resolve())
    .then(() => fetchSummary(graph))
    .then(async (result) => {
      await saveResult(clientId, result);
      setStatusCache(clientId, "done");
      return result;
    })
    .catch(async (err: unknown) => {
      await setSummaryStatus(clientId, "error").catch(() => {});
      setStatusCache(clientId, "error");
      throw err instanceof Error ? err : new Error("summary request failed");
    });
  pendingMap.set(clientId, p);
  return p;
}

// Called from the mind-map "Finalise" action.
export function submitMindMap(clientId: string, graph: MindMapGraph): void {
  startJob(clientId, graph, true);
}

// Called from the summarise page. Resolves the result, surviving reloads:
//   • request in flight this session → reuse it
//   • finished previously            → stored result
//   • pending/error after a reload   → re-issue from the saved graph snapshot
//   • never submitted                → null (page bounces back to the canvas)
export async function resumeSummary(
  clientId: string,
): Promise<SummariseResult | null> {
  const inFlight = pendingMap.get(clientId);
  if (inFlight) return inFlight;

  const row = await fetchSummaryRow(clientId);
  if (!row || !row.status) {
    setStatusCache(clientId, null);
    return null;
  }
  setStatusCache(clientId, row.status);

  if (row.status === "done" && row.summaryResult) return row.summaryResult;

  // pending (interrupted by reload) or error → retry from the snapshot.
  if (!row.graph) return null;
  return startJob(clientId, row.graph, false);
}

// The last completed summary result, if any. The plan stage reads this to seed
// its planner input. Returns null until a summary has landed.
export async function getSummaryResult(
  clientId: string,
): Promise<SummariseResult | null> {
  const row = await fetchSummaryRow(clientId);
  return row?.summaryResult ?? null;
}

// Clear a finished/failed job (e.g. when the user starts a fresh idea).
export async function clearSummary(clientId: string): Promise<void> {
  pendingMap.delete(clientId);
  setStatusCache(clientId, null);
  await deleteSummary(clientId);
}
