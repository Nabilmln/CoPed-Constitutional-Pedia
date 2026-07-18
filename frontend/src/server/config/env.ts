import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

let cachedDatabaseEnv: DatabaseEnv | undefined;

export const getDatabaseEnv = (): DatabaseEnv => {
  if (cachedDatabaseEnv) {
    return cachedDatabaseEnv;
  }

  const result = databaseEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid database environment: ${details}`);
  }

  cachedDatabaseEnv = result.data;
  return cachedDatabaseEnv;
};
