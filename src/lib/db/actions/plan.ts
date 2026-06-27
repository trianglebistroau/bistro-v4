"use server";

import { and, eq } from "drizzle-orm";
import type { PlanTask } from "@/types/plan";
import { ensureUser, requireUserId } from "../auth";
import { db } from "../index";
import { folders } from "../schema/folders";

// Plan board persistence ↔ `folders.plan` jsonb, scoped per user+clientId.

// The board for one idea. Normalizes tasks saved before `phase` existed so old
// data still slots into a column instead of vanishing.
export async function getPlanTasks(clientId: string): Promise<PlanTask[]> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ plan: folders.plan })
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.clientId, clientId)))
    .limit(1);
  return (row?.plan ?? []).map((t) => ({ ...t, phase: t.phase ?? "pre" }));
}

// Upsert the whole board. Upsert (not update) so the standalone "default" plan —
// which may have no folder row yet — still persists; a real idea's save touches
// only `plan`.
export async function savePlanTasks(
  clientId: string,
  tasks: PlanTask[],
): Promise<void> {
  const userId = await requireUserId();
  await ensureUser(userId);
  await db
    .insert(folders)
    .values({ userId, clientId, plan: tasks })
    .onConflictDoUpdate({
      target: [folders.userId, folders.clientId],
      set: { plan: tasks },
    });
}
