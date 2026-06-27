import { date, integer, jsonb, serial, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import { timestamps } from "../utils";
import { folders } from "./folders";
import { nextJsAppSchema } from "./schema";

// Calendar events belong to a folder (idea). Scheduled plan tasks are NOT stored
// here — they project from `folders.plan` at read time in getAllEvents().
export const calendarEvents = nextJsAppSchema.table('calendar_events', {
  id: serial().primaryKey(),
  folderId: integer().references(() => folders.id, { onDelete: "cascade" }),
  eventDate: date(),
  time: varchar({ length: 5 }),     // "HH:MM"
  endTime: varchar({ length: 5 }),  // "HH:MM"
  title: varchar({ length: 255 }),
  notes: jsonb().$type<string[]>(),
  location: varchar({ length: 255 }),
  reminders: jsonb().$type<string[]>(),
  ...timestamps
});

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  folders: one(folders, {
    fields: [calendarEvents.folderId],
    references: [folders.id],
  }),
}));
