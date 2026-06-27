import { jsonb, serial, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import type { CreativeScript } from "@/types/creative";
import type { CanvasState } from "@/types/mindmap";
import type { PlanTask } from "@/types/plan";
import { timestamps } from "../utils";
import { calendarEvents } from "./calendar_events";
import { nextJsAppSchema } from "./schema";
import { summaries } from "./summaries";
import { tasks } from "./tasks";
import { users } from "./users";

// One row = one creative idea/script (FK directly to the Clerk user).
// `canvas` holds the whole mind-map graph as one jsonb blob (same shape the app
// kept in localStorage); `plan` holds the plan board.
export const folders = nextJsAppSchema.table(
  "folders",
  {
    id: serial().primaryKey(),
    userId: text().references(() => users.id),
    // Stable string id the app routes on (`?script=<clientId>`); unique per user.
    clientId: text(),
    name: varchar({ length: 255 }),
    emoji: varchar({ length: 8 }),
    goal: text(),
    platform: varchar({ length: 16 }).$type<CreativeScript["platform"]>(),
    colorTag: varchar({ length: 8 }).$type<CreativeScript["colorTag"]>(),
    canvas: jsonb().$type<CanvasState>(),
    plan: jsonb().$type<PlanTask[]>(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("folders_user_client_idx").on(table.userId, table.clientId),
  ],
);

export const foldersRelations = relations(folders, ({ one, many }) => ({
  users: one(users, {
    fields: [folders.userId],
    references: [users.id],
  }),
  summaries: many(summaries),
  tasks: many(tasks),
  calendarEvents: many(calendarEvents),
}));
