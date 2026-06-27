"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { CreativeScript, ScriptColor } from "@/types/creative";
import type { ScriptDraft } from "@/utils/creative";
import { ensureUser, requireUserId } from "../auth";
import { db } from "../index";
import { folders } from "../schema/folders";

// A DB `folders` row IS one creative idea/script. The app still routes on the
// string `?script=<clientId>` id, so every read/write keys off `clientId`, never
// the serial primary key. The "My Scripts" folder grouping stays client-side for
// now (see utils/creative.ts) — ideas FK straight to the Clerk user.

// Client-side grouping id every idea reports until folders move to the DB.
const DEFAULT_FOLDER_ID = "f-default";
// Colours cycle through new ideas so the card grid stays varied (parity with the
// old localStorage `creative.ts` behaviour).
const COLOR_CYCLE: ScriptColor[] = ["blue", "yellow", "pink"];

type FolderRow = typeof folders.$inferSelect;

function mapRow(row: FolderRow): CreativeScript {
  const goal = row.goal ?? "";
  return {
    id: row.clientId ?? String(row.id),
    title: row.name ?? "Untitled project",
    body: goal,
    folderId: DEFAULT_FOLDER_ID,
    createdAt: row.createdAt.toISOString(),
    emoji: row.emoji ?? "✨",
    colorTag: row.colorTag ?? undefined,
    goal,
    platform: row.platform ?? undefined,
  };
}

// All of the current user's ideas, newest grid first is left to the caller.
export async function listIdeas(): Promise<CreativeScript[]> {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(folders)
    .where(eq(folders.userId, userId));
  return rows.map(mapRow);
}

// Look up one idea by its routing `clientId`, scoped to the current user so a
// foreign id resolves to null instead of leaking another user's row. The
// special `"default"` id is lazily materialised so the default map always has a
// backing row.
export async function getIdeaByClientId(
  clientId: string,
): Promise<CreativeScript | null> {
  const userId = await requireUserId();
  if (clientId === "default") return ensureDefaultIdea(userId);
  const [row] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.clientId, clientId)))
    .limit(1);
  return row ? mapRow(row) : null;
}

// Create an idea from the create-project modal answers. Mirrors the old
// `addScript`: empty name → "Untitled project", title capped at 48 chars.
export async function createIdea(draft: ScriptDraft): Promise<CreativeScript> {
  const userId = await requireUserId();
  await ensureUser(userId);

  const name = draft.name.trim();
  const title = name.length > 0 ? name.slice(0, 48) : "Untitled project";
  const count = await db.$count(folders, eq(folders.userId, userId));

  const [row] = await db
    .insert(folders)
    .values({
      userId,
      clientId: `s-${randomUUID()}`,
      name: title,
      emoji: "✨",
      goal: draft.goal.trim(),
      platform: draft.platform || null,
      colorTag: COLOR_CYCLE[count % COLOR_CYCLE.length],
    })
    .returning();
  return mapRow(row);
}

export async function renameIdea(
  clientId: string,
  name: string,
): Promise<void> {
  const userId = await requireUserId();
  const title = name.trim().slice(0, 48) || "Untitled project";
  await db
    .update(folders)
    .set({ name: title })
    .where(and(eq(folders.userId, userId), eq(folders.clientId, clientId)));
}

export async function deleteIdea(clientId: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(folders)
    .where(and(eq(folders.userId, userId), eq(folders.clientId, clientId)));
}

// Lazily create (or fetch) the per-user `"default"` idea backing the default map.
async function ensureDefaultIdea(userId: string): Promise<CreativeScript> {
  const [existing] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.userId, userId), eq(folders.clientId, "default")))
    .limit(1);
  if (existing) return mapRow(existing);

  await ensureUser(userId);
  const [row] = await db
    .insert(folders)
    .values({
      userId,
      clientId: "default",
      name: "Untitled project",
      emoji: "✨",
      colorTag: "blue",
    })
    .returning();
  return mapRow(row);
}
