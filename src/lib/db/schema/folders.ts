import { jsonb, pgTable, serial, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "../utils";
import { users } from "./users";

export const folders = pgTable('folders', {
  id: serial().primaryKey(),
  userId: serial().references(() => users.id),
  folderName: varchar(),
  emoji: varchar({ length: 1 }),
  bigPicture: jsonb(),
  composition: jsonb(),
  toneMood: jsonb(),
  targetAudience: jsonb(),
  ...timestamps
});