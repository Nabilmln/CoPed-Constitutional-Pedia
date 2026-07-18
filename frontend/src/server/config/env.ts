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

const ragEnvSchema = z.object({
  RAG_MATCH_COUNT: z.coerce.number().int().min(1).max(20).default(5),
  RAG_SIMILARITY_THRESHOLD: z.coerce
    .number()
    .min(-1)
    .max(1)
    .default(0.3),
});

export type RagEnv = z.infer<typeof ragEnvSchema>;

const generationEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
  GEMINI_GENERATION_MODEL: z
    .string()
    .trim()
    .min(1)
    .default("gemini-3.1-flash-lite"),
});

export type GenerationEnv = z.infer<typeof generationEnvSchema>;

const chatEnvSchema = z.object({
  CHAT_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(10),
  CHAT_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .min(10)
    .max(3_600)
    .default(60),
});

export type ChatEnv = z.infer<typeof chatEnvSchema>;

let cachedDatabaseEnv: DatabaseEnv | undefined;
let cachedEmbeddingEnv: EmbeddingEnv | undefined;
let cachedRagEnv: RagEnv | undefined;
let cachedGenerationEnv: GenerationEnv | undefined;
let cachedChatEnv: ChatEnv | undefined;

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

export const getRagEnv = (): RagEnv => {
  if (cachedRagEnv) {
    return cachedRagEnv;
  }

  const result = ragEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid RAG environment: ${details}`);
  }

  cachedRagEnv = result.data;
  return cachedRagEnv;
};

export const getGenerationEnv = (): GenerationEnv => {
  if (cachedGenerationEnv) {
    return cachedGenerationEnv;
  }

  const result = generationEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid generation environment: ${details}`);
  }

  cachedGenerationEnv = result.data;
  return cachedGenerationEnv;
};

export const getChatEnv = (): ChatEnv => {
  if (cachedChatEnv) {
    return cachedChatEnv;
  }

  const result = chatEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid chat environment: ${details}`);
  }

  cachedChatEnv = result.data;
  return cachedChatEnv;
};
