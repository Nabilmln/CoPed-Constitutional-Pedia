import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Database check failed: DATABASE_URL is not configured. Copy .env.example to .env.local first.",
  );
  process.exitCode = 1;
} else {
  try {
    const sql = neon(databaseUrl);
    const [status] = await sql`
      SELECT
        current_database() AS database_name,
        EXISTS (
          SELECT 1
          FROM pg_extension
          WHERE extname = 'vector'
        ) AS vector_enabled
    `;

    console.log("Neon database connection successful.", {
      database: status.database_name,
      vectorEnabled: status.vector_enabled,
    });
  } catch (error) {
    console.error("Database check failed.", {
      reason: error instanceof Error ? error.message : "Unknown database error",
    });
    process.exitCode = 1;
  }
}
