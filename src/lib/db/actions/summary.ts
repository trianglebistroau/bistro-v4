"use server";

import { and, eq } from "drizzle-orm";
import type { SummariseResult } from "@/types/summarise";
import type { MindMapGraph } from "@/utils/mindmap-export";
import { ensureUser, requireUserId } from "../auth";
import { db } from "../index";
import { folders } from "../schema/folders";
import { type SummariseStatus, summaries } from "../schema/summaries";

// Summarise persistence on the per-idea `summaries` row (FK → folders.id, one
// row per folder). Keyed from the client by the idea's routing `clientId`, all
// scoped to the current Clerk user. The AI fetch + retry stays client-side in
// utils/summarise-service.ts; only the snapshot/status/result persist here.

// What the client needs to resume a job after a reload.
export interface SummaryRow {
  status: SummariseStatus | null;
  graph: MindMapGraph | null;
  summaryResult: SummariseResult | null;
}

// Resolve folder.id for (user, clientId). `create` upserts the folder row so the
// standalone "default" map — which may have no row yet — can still hold a
// summary; reads pass `create: false` and tolerate a missing folder.
async function resolveFolderId(
  userId: string,
  clientId: string,
  create: boolean,
): Promise<number | null> {
  const [row] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.clientId, clientId)))
    .limit(1);
  if (row) return row.id;
  if (!create) return null;
  await ensureUser(userId);
  const [created] = await db
    .insert(folders)
    .values({ userId, clientId })
    .returning({ id: folders.id });
  return created.id;
}

// Manual upsert — `summaries` has no unique constraint on folderId, so select
// the existing row then update, else insert.
async function upsertSummary(
  folderId: number,
  patch: Partial<typeof summaries.$inferInsert>,
): Promise<void> {
  const [existing] = await db
    .select({ id: summaries.id })
    .from(summaries)
    .where(eq(summaries.folderId, folderId))
    .limit(1);
  if (existing) {
    await db.update(summaries).set(patch).where(eq(summaries.id, existing.id));
  } else {
    await db.insert(summaries).values({ folderId, ...patch });
  }
}

// Snapshot the graph + mark pending when a job kicks off.
export async function saveGraph(
  clientId: string,
  graph: MindMapGraph,
): Promise<void> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, true);
  if (folderId == null) return;
  await upsertSummary(folderId, {
    graph,
    status: "pending",
    summaryResult: null,
    completion: false,
  });
}

// Persist the finished result (status → done, completion → true).
export async function saveResult(
  clientId: string,
  result: SummariseResult,
): Promise<void> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, true);
  if (folderId == null) return;
  await upsertSummary(folderId, {
    summaryResult: result,
    completion: true,
    status: "done",
  });
}

export async function setSummaryStatus(
  clientId: string,
  status: SummariseStatus,
): Promise<void> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, true);
  if (folderId == null) return;
  await upsertSummary(folderId, { status });
}

// Read the summary row for resume; null when the user has no such idea/row.
export async function fetchSummaryRow(
  clientId: string,
): Promise<SummaryRow | null> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, false);
  if (folderId == null) return null;
  const [row] = await db
    .select({
      status: summaries.status,
      graph: summaries.graph,
      summaryResult: summaries.summaryResult,
    })
    .from(summaries)
    .where(eq(summaries.folderId, folderId))
    .limit(1);
  if (!row) return null;
  return {
    status: row.status ?? null,
    graph: row.graph ?? null,
    summaryResult: row.summaryResult ?? null,
  };
}

export async function deleteSummary(clientId: string): Promise<void> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, false);
  if (folderId == null) return;
  await db.delete(summaries).where(eq(summaries.folderId, folderId));
}
