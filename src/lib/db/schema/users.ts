import { pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";

export const users = pgTable('users', {
  id: serial().primaryKey(),
  username: varchar(),
  ...timestamps
});