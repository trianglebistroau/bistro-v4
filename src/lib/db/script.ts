import { db } from './db';
import { demoUsers } from './schema';

async function main() {
  try {
    await db.insert(demoUsers).values({ name: 'John Doe' });
    const result = await db.select().from(demoUsers);
    console.log('Successfully queried the database:', result);
  } catch (error) {
    console.error('Error querying the database:', error);
  } finally {
    // Close the database connection to ensure proper shutdown for Neon WebSocket, node-postgres, and postgres.js drivers
    await db.$client.end();
  }
}
main();