import { pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: varchar({ length: 255 }),
  ...timestamps
});