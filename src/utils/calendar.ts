import type { CreativeScript } from "@/types/creative";
import type { CalendarEvent, EnrichedCalendarEvent } from "@/types/plan";
import { getScripts } from "@/utils/creative";
import { getPlanTasks } from "@/utils/plan";
import { storage } from "@/utils/storage";

// Calendar-events repo — events are stored per folder (creative script), one
// key per script, through the shared storage seam. Mirrors mind-map-store so a
// later swap to a DB (calendar_events.script_id) touches one adapter. The
// calendar page aggregates across all scripts via getAllEvents().

const PREFIX = "bistro_calendar_events_";
const key = (scriptId: string) => `${PREFIX}${scriptId}`;

export function loadEvents(scriptId: string): CalendarEvent[] {
  return storage.read<CalendarEvent[]>(key(scriptId), []);
}

export function saveEvents(scriptId: string, events: CalendarEvent[]): void {
  storage.write(key(scriptId), events);
}

export function addEvent(
  scriptId: string,
  input: { date: string; title: string; notes?: string[]; time?: string },
): CalendarEvent {
  const event: CalendarEvent = {
    id: `evt-${Date.now()}`,
    scriptId,
    date: input.date,
    time: input.time,
    title: input.title,
    notes: input.notes ?? [],
  };
  saveEvents(scriptId, [...loadEvents(scriptId), event]);
  return event;
}

export function updateEvent(scriptId: string, event: CalendarEvent): void {
  saveEvents(
    scriptId,
    loadEvents(scriptId).map((e) => (e.id === event.id ? event : e)),
  );
}

export function deleteEvent(scriptId: string, id: string): void {
  saveEvents(
    scriptId,
    loadEvents(scriptId).filter((e) => e.id !== id),
  );
}

// ── Colour mapping (per folder colour tag) ─────────────────────────────────

export interface ColorClasses {
  /** Filter chip + event block fill. */
  chip: string;
  /** Event block on the week grid. */
  block: string;
  /** Small colour dot. */
  dot: string;
}

const COLORS: Record<"blue" | "yellow" | "pink", ColorClasses> = {
  blue: {
    chip: "bg-blue-100 text-blue-700",
    block: "bg-blue-100 border-blue-300 text-blue-800",
    dot: "bg-blue-400",
  },
  yellow: {
    chip: "bg-amber-100 text-amber-800",
    block: "bg-amber-100 border-amber-300 text-amber-900",
    dot: "bg-amber-400",
  },
  pink: {
    chip: "bg-rose-100 text-rose-700",
    block: "bg-rose-100 border-rose-300 text-rose-800",
    dot: "bg-rose-400",
  },
};

export function colorFor(tag?: string): ColorClasses {
  return COLORS[tag as "blue" | "yellow" | "pink"] ?? COLORS.blue;
}

// ── Aggregation (pure — unit-tested) ───────────────────────────────────────

// Join events with their folder's title + colour; drop events whose folder no
// longer exists so the calendar never renders orphans.
export function enrich(
  events: CalendarEvent[],
  scripts: CreativeScript[],
): EnrichedCalendarEvent[] {
  const byId = new Map(scripts.map((s) => [s.id, s]));
  return events.flatMap((e) => {
    const script = byId.get(e.scriptId);
    if (!script) return [];
    return [
      { ...e, scriptTitle: script.title, colorTag: script.colorTag ?? "blue" },
    ];
  });
}

// All calendar items across every folder: stored events PLUS scheduled plan
// tasks (so a task with a date shows on the calendar in its folder's colour).
export function getAllEvents(): EnrichedCalendarEvent[] {
  const scripts = getScripts();
  const out: EnrichedCalendarEvent[] = [];

  for (const s of scripts) {
    const colorTag = s.colorTag ?? "blue";

    for (const e of loadEvents(s.id)) {
      out.push({ ...e, scriptTitle: s.title, colorTag });
    }

    // Scheduled plan tasks → read-only calendar entries (tagged with taskId).
    for (const t of getPlanTasks(s.id)) {
      if (!t.scheduledDate) continue;
      out.push({
        id: `task-${t.id}`,
        scriptId: s.id,
        date: t.scheduledDate,
        title: t.text,
        notes: [],
        scriptTitle: s.title,
        colorTag,
        taskId: t.id,
      });
    }
  }

  return out;
}
