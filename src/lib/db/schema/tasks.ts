import { integer, pgEnum, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { folders } from "./folders";

export const phaseEnum = pgEnum('phase', ['pre-production', 'production', 'post-production']);

export const tasks = pgTable('tasks', {
  id: serial().primaryKey(),
  folderId: integer().references(() => folders.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }),
  phase: phaseEnum(),
  date: timestamp(),
  ...timestamps
});