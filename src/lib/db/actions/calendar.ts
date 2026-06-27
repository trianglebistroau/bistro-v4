"use server";

import { and, eq, inArray } from "drizzle-orm";
import type { CalendarEvent, EnrichedCalendarEvent } from "@/types/plan";
import { ensureUser, requireUserId } from "../auth";
import { db } from "../index";
import { calendarEvents } from "../schema/calendar_events";
import { folders } from "../schema/folders";

// Calendar persistence on `calendar_events` (FK → folders.id), scoped per user.
// The app routes on the folder's string `clientId` (`scriptId` on a CalendarEvent),
// so every mutation resolves clientId → folder.id under the current user before
// touching a row — a foreign or unknown idea can never be written.
//
// Scheduled plan tasks are NOT stored here; getAllEvents projects them from each
// folder's `plan` jsonb at read time.

type EventRow = typeof calendarEvents.$inferSelect;

// Map a DB row → the client CalendarEvent. `scriptId` is the folder's clientId
// (passed in, since the row only carries the numeric folderId).
function mapRow(row: EventRow, clientId: string): CalendarEvent {
  return {
    id: String(row.id),
    scriptId: clientId,
    date: row.eventDate ?? "",
    time: row.time ?? undefined,
    endTime: row.endTime ?? undefined,
    title: row.title ?? "",
    notes: row.notes ?? [],
    location: row.location ?? undefined,
    reminders: row.reminders ?? undefined,
  };
}

// Resolve folder.id for (user, clientId). `create` upserts the folder so events
// can attach to the standalone "default" idea even before it has a row.
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

// Events for one idea (used by the plan page's per-folder calendar).
export async function loadEvents(clientId: string): Promise<CalendarEvent[]> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, false);
  if (folderId == null) return [];
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.folderId, folderId));
  return rows.map((r) => mapRow(r, clientId));
}

export async function addEvent(
  clientId: string,
  input: { date: string; title: string; notes?: string[]; time?: string },
): Promise<CalendarEvent> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, true);
  if (folderId == null) throw new Error("Idea not found");
  const [row] = await db
    .insert(calendarEvents)
    .values({
      folderId,
      eventDate: input.date,
      title: input.title,
      notes: input.notes ?? [],
      time: input.time,
    })
    .returning();
  return mapRow(row, clientId);
}

export async function updateEvent(
  clientId: string,
  event: CalendarEvent,
): Promise<void> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, false);
  if (folderId == null) return;
  const id = Number(event.id);
  if (Number.isNaN(id)) return;
  await db
    .update(calendarEvents)
    .set({
      eventDate: event.date,
      time: event.time ?? null,
      endTime: event.endTime ?? null,
      title: event.title,
      notes: event.notes,
      location: event.location ?? null,
      reminders: event.reminders ?? null,
    })
    .where(
      and(eq(calendarEvents.id, id), eq(calendarEvents.folderId, folderId)),
    );
}

export async function deleteEvent(clientId: string, id: string): Promise<void> {
  const userId = await requireUserId();
  const folderId = await resolveFolderId(userId, clientId, false);
  if (folderId == null) return;
  const numId = Number(id);
  if (Number.isNaN(numId)) return;
  await db
    .delete(calendarEvents)
    .where(
      and(eq(calendarEvents.id, numId), eq(calendarEvents.folderId, folderId)),
    );
}

// Every calendar item across all of the user's ideas, from ONE server call:
// stored events PLUS scheduled plan tasks projected from each folder's `plan`
// jsonb, each enriched with the idea's title + colour. No client-side N+1.
export async function getAllEvents(): Promise<EnrichedCalendarEvent[]> {
  const userId = await requireUserId();

  const folderRows = await db
    .select({
      id: folders.id,
      clientId: folders.clientId,
      name: folders.name,
      colorTag: folders.colorTag,
      plan: folders.plan,
    })
    .from(folders)
    .where(eq(folders.userId, userId));
  if (folderRows.length === 0) return [];

  // One query for every folder's events, then bucket by folderId — avoids a
  // per-folder round trip.
  const folderIds = folderRows.map((f) => f.id);
  const eventRows = await db
    .select()
    .from(calendarEvents)
    .where(inArray(calendarEvents.folderId, folderIds));
  const eventsByFolder = new Map<number, EventRow[]>();
  for (const e of eventRows) {
    if (e.folderId == null) continue;
    const list = eventsByFolder.get(e.folderId) ?? [];
    list.push(e);
    eventsByFolder.set(e.folderId, list);
  }

  const out: EnrichedCalendarEvent[] = [];
  for (const folder of folderRows) {
    const clientId = folder.clientId ?? String(folder.id);
    const scriptTitle = folder.name ?? "Untitled project";
    const colorTag = folder.colorTag ?? "blue";

    for (const row of eventsByFolder.get(folder.id) ?? []) {
      out.push({ ...mapRow(row, clientId), scriptTitle, colorTag });
    }

    // Scheduled plan tasks → read-only calendar entries (tagged with taskId).
    for (const t of folder.plan ?? []) {
      if (!t.scheduledDate) continue;
      out.push({
        id: `task-${t.id}`,
        scriptId: clientId,
        date: t.scheduledDate,
        time: t.scheduledStartTime,
        endTime: t.scheduledEndTime,
        title: t.text,
        notes: [],
        scriptTitle,
        colorTag,
        taskId: t.id,
        phase: t.phase,
      });
    }
  }

  return out;
}
