import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Prevent multiple instances in Next.js dev hot-reload
const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql };
if (!globalForDb._pgClient) {
  globalForDb._pgClient = postgres(process.env.DATABASE_URL!, { max: 5 });
}
export const db = drizzle(globalForDb._pgClient);
