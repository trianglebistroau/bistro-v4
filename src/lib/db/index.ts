import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { calendarEvents, calendarEventsRelations } from "./schema/calendar_events";
import { folders, foldersRelations } from "./schema/folders";
import { summaries, summariesRelations } from "./schema/summaries";
import { tasks, tasksRelations } from "./schema/tasks";
import { users, usersRelations } from "./schema/users";

// App-facing Drizzle client. Separate from the migration-only client at
// `db/db.ts` (which has no schema binding and no `server-only` guard so the tsx
// migrate script can import it). `server-only` keeps DATABASE_URL out of the
// client bundle. Single shared Pool reused across every server action.
export const schema = {
  users,
  usersRelations,
  folders,
  foldersRelations,
  summaries,
  summariesRelations,
  tasks,
  tasksRelations,
  calendarEvents,
  calendarEventsRelations,
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema, casing: "snake_case" });
