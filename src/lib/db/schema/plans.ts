import { pgTable, serial } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { folders } from "./folders";

export const plans = pgTable('plans', {
  id: serial().primaryKey().references(() => folders.id, { onDelete: "cascade" }),
  ...timestamps
});