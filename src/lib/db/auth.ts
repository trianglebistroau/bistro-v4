import "server-only";

import { auth } from "@clerk/nextjs/server";
import { db } from "./index";
import { users } from "./schema/users";

// The current Clerk user id, or throw. Every server action calls this first so a
// signed-out request can never read or write idea data.
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Ensure a `users` row exists so the `folders.userId` FK holds. Called lazily on
// idea creation — Clerk owns identity, this is just the local FK anchor.
export async function ensureUser(userId: string): Promise<void> {
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
}
