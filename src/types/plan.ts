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
  date: string;
  title: string;
  notes: string[];
}

export type CalendarView = "monthly" | "weekly";
