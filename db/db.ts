import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// App env lives in .env.local (Next.js convention); load it for tsx scripts.
config({ path: '.env.local' });
config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool);