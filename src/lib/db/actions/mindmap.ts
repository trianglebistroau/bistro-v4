"use server";

import { and, eq } from "drizzle-orm";
import type { CanvasState } from "@/types/mindmap";
import { ensureUser, requireUserId } from "../auth";
import { db } from "../index";
import { folders } from "../schema/folders";

// Mind-map canvas persistence. State is keyed by the idea's routing `clientId`
// (the active `?script=` id, or "default" for the standalone map), scoped to the
// current Clerk user so one user can never read or overwrite another's canvas.

// Returns null when this idea has no saved canvas yet — the caller seeds the
// default nodes/edges.
export async function loadCanvas(
  clientId: string,
): Promise<CanvasState | null> {
  const userId = await requireUserId();
  const [row] = await db
    .select({ canvas: folders.canvas })
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.clientId, clientId)))
    .limit(1);
  return row?.canvas ?? null;
}

// Upsert the canvas onto the idea's row. Upsert (not update) so the standalone
// "default" map — which may have no row yet — still persists. For a real idea
// the conflict path updates only `canvas`, leaving name/goal/plan untouched.
export async function saveCanvas(
  clientId: string,
  state: CanvasState,
): Promise<void> {
  const userId = await requireUserId();
  await ensureUser(userId);
  await db
    .insert(folders)
    .values({ userId, clientId, canvas: state })
    .onConflictDoUpdate({
      target: [folders.userId, folders.clientId],
      set: { canvas: state },
    });
}
