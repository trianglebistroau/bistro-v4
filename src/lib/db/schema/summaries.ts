import { boolean, integer, jsonb, serial, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import type { SummariseResult } from "@/types/summarise";
import type { MindMapGraph } from "@/utils/mindmap-export";
import { timestamps } from "../utils";
import { folders } from "./folders";
import { nextJsAppSchema } from "./schema";

export type SummariseStatus = "pending" | "done" | "error";

// One row per folder. `graph` is the snapshot submitted for summarisation so a
// reload can resume; `status` gates the creative-flow sidebar tabs.
export const summaries = nextJsAppSchema.table("summaries", {
  id: serial().primaryKey(),
  folderId: integer().references(() => folders.id, { onDelete: "cascade" }),
  graph: jsonb().$type<MindMapGraph>(),
  status: varchar({ length: 12 }).$type<SummariseStatus>(),
  summaryResult: jsonb().$type<SummariseResult>(),
  completion: boolean(),
  ...timestamps,
});

export const summariesRelations = relations(summaries, ({ one }) => ({
  folders: one(folders, {
    fields: [summaries.folderId],
    references: [folders.id],
  }),
}));
