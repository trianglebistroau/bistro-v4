import { jsonb, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { users } from "./users";

export const folders = pgTable('folders', {
  id: serial().primaryKey(),
  userId: text().references(() => users.id),
  name: varchar({ length: 255 }),
  emoji: varchar({ length: 8 }),
  bigPicture: jsonb(),
  composition: jsonb(),
  toneMood: jsonb(),
  targetAudience: jsonb(),
  ...timestamps
});