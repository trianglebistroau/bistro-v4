// Production phase a task belongs to — drives which board column it shows in.
export type PlanPhase = "pre" | "production" | "post";

export interface PlanTask {
  id: string;
  text: string;
  scheduledDate?: string;
  completed: boolean;
  colorTag: "pink" | "blue" | "yellow" | "default";
  phase: PlanPhase;
}

export interface CalendarEvent {
  id: string;
  /** Folder (creative script/idea) this event belongs to. */
  scriptId: string;
  date: string;
  /** Optional intra-day ordering, "HH:MM". */
  time?: string;
  title: string;
  notes: string[];
}

// A calendar event joined with its folder's display info (title + colour),
// produced by the cross-folder aggregation for the calendar page.
export interface EnrichedCalendarEvent extends CalendarEvent {
  scriptTitle: string;
  colorTag: "blue" | "yellow" | "pink";
  /** Set when this entry is derived from a scheduled plan task (read-only). */
  taskId?: string;
}

export type CalendarView = "monthly" | "weekly";
