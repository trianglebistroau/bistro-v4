import { jsonb, serial, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import type { CreativeScript } from "@/types/creative";
import type { PlanTask } from "@/types/plan";
import type { CanvasState, CustomItems } from "@/utils/mind-map-store";
import { timestamps } from "../utils";
import { calendarEvents } from "./calendar_events";
import { nextJsAppSchema } from "./schema";
import { summaries } from "./summaries";
import { tasks } from "./tasks";
import { users } from "./users";

// One row = one creative idea/script (FK directly to the Clerk user). The four
// section jsonb columns ARE the mind-map sidebar chip sections (CustomItems);
// `canvas`/`plan` hold the mind-map geometry and the plan board.
export const folders = nextJsAppSchema.table('folders', {
  id: serial().primaryKey(),
  userId: text().references(() => users.id),
  // Stable string id the app routes on (`?script=<clientId>`); unique per user.
  clientId: text(),
  name: varchar({ length: 255 }),
  emoji: varchar({ length: 8 }),
  goal: text(),
  platform: varchar({ length: 16 }).$type<CreativeScript["platform"]>(),
  colorTag: varchar({ length: 8 }).$type<CreativeScript["colorTag"]>(),
  bigPicture: jsonb().$type<CustomItems[string]>(),
  composition: jsonb().$type<CustomItems[string]>(),
  toneMood: jsonb().$type<CustomItems[string]>(),
  targetAudience: jsonb().$type<CustomItems[string]>(),
  canvas: jsonb().$type<CanvasState>(),
  plan: jsonb().$type<PlanTask[]>(),
  ...timestamps
}, (table) => [
  uniqueIndex('folders_user_client_idx').on(table.userId, table.clientId),
]);

export const foldersRelations = relations(folders, ({one, many}) => ({
  users: one(users, {
    fields: [folders.userId],
    references: [users.id]
  }),
  summaries: many(summaries),
  tasks: many(tasks),
  calendarEvents: many(calendarEvents),
}));