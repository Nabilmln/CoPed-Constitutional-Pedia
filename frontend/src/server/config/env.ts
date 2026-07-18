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

const embeddingEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
  GEMINI_EMBEDDING_MODEL: z
    .string()
    .trim()
    .min(1)
    .default("gemini-embedding-001"),
  GEMINI_EMBEDDING_DIMENSION: z.coerce
    .number()
    .int()
    .positive()
    .default(768),
  GEMINI_EMBEDDING_BATCH_SIZE: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(8),
});

export type EmbeddingEnv = z.infer<typeof embeddingEnvSchema>;

let cachedDatabaseEnv: DatabaseEnv | undefined;
let cachedEmbeddingEnv: EmbeddingEnv | undefined;

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

export const getEmbeddingEnv = (): EmbeddingEnv => {
  if (cachedEmbeddingEnv) {
    return cachedEmbeddingEnv;
  }

  const result = embeddingEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid embedding environment: ${details}`);
  }

  cachedEmbeddingEnv = result.data;
  return cachedEmbeddingEnv;
};
