import { boolean, integer, jsonb, pgTable, serial } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { folders } from "./folders";

export const summaries = pgTable('summaries', {
  id: serial().primaryKey(),
  folderId: integer().references(() => folders.id),
  summaryResult: jsonb(),
  completion: boolean(),
  ...timestamps
});