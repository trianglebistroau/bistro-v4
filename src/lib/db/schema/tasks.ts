import { pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { folders } from "./folders";
import { plans } from "./plans";

export const phaseEnum = pgEnum('phase', ['pre-production', 'production', 'post-production']);

export const tasks = pgTable('tasks', {
  id: serial().primaryKey(),
  folderId: serial().references(() => plans.id),
  name: serial(),
  phase: phaseEnum(),
  date: timestamp(),
  ...timestamps
});