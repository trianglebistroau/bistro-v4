import { boolean, jsonb, pgTable, serial } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { folders } from "./folders";

export const summaries = pgTable('summaries', {
  id: serial().primaryKey(),
  folderId: serial().references(() => folders.id),
  summaryResult: jsonb(),
  completiom: boolean(),
  ...timestamps
});