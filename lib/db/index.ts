import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Create a free Postgres database at neon.tech, " +
      "copy its connection string, and set it as DATABASE_URL in your environment."
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
