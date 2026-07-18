import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseEnv } from "@/server/config/env";

import * as schema from "./schema";

type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

const createDatabase = () => {
  const { DATABASE_URL } = getDatabaseEnv();
  const sql = neon(DATABASE_URL);

  return drizzle(sql, { schema });
};

export const getDatabase = (): Database => {
  database ??= createDatabase();
  return database;
};
