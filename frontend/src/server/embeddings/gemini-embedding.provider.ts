import { ApiError, GoogleGenAI } from "@google/genai";

import { getEmbeddingEnv } from "@/server/config/env";

import type {
  EmbedTextsInput,
  EmbeddingProvider,
} from "./embedding.types";

const MAX_ATTEMPTS = 4;
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

type GeminiEmbeddingClient = {
  models: {
    embedContent(input: {
      model: string;
      contents: string[];
      config: {
        taskType: string;
        title?: string;
        outputDimensionality: number;
        abortSignal: AbortSignal;
      };
    }): Promise<{ embeddings?: Array<{ values?: number[] }> }>;
  };
};

type GeminiEmbeddingProviderOptions = {
  apiKey?: string;
  model?: string;
  dimension?: number;
  client?: GeminiEmbeddingClient;
  sleep?: (durationMs: number) => Promise<void>;
  timeoutMs?: number;
};

const sleep = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};

export const normalizeEmbedding = (values: number[]) => {
  const magnitude = Math.sqrt(
    values.reduce((sum, value) => sum + value * value, 0),
  );

  if (!Number.isFinite(magnitude) || magnitude === 0) {
    throw new Error("Gemini returned an invalid zero-length embedding.");
  }

  return values.map((value) => value / magnitude);
};

const getStatusCode = (error: unknown) =>
  error instanceof ApiError ? error.status : undefined;

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimension: number;

  private readonly client: GeminiEmbeddingClient;
  private readonly wait: (durationMs: number) => Promise<void>;
  private readonly timeoutMs: number;

  constructor(options: GeminiEmbeddingProviderOptions = {}) {
    const configuredEnv =
      options.client && options.model && options.dimension && !options.apiKey
        ? null
        : getEmbeddingEnv();
    const apiKey = options.apiKey ?? configuredEnv?.GEMINI_API_KEY;

    this.model =
      options.model ??
      configuredEnv?.GEMINI_EMBEDDING_MODEL ??
      "gemini-embedding-001";
    this.dimension =
      options.dimension ??
      configuredEnv?.GEMINI_EMBEDDING_DIMENSION ??
      768;
    this.client =
      options.client ??
      new GoogleGenAI({
        apiKey,
      });
    this.wait = options.sleep ?? sleep;
    this.timeoutMs =
      options.timeoutMs ??
      configuredEnv?.GEMINI_REQUEST_TIMEOUT_MS ??
      15_000;
  }

  async embedTexts(input: EmbedTextsInput): Promise<number[][]> {
    if (input.texts.length === 0) {
      return [];
    }

    const taskType =
      input.task === "document"
        ? "RETRIEVAL_DOCUMENT"
        : "RETRIEVAL_QUERY";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await this.client.models.embedContent({
          model: this.model,
          contents: input.texts,
          config: {
            taskType,
            title: input.task === "document" ? input.title : undefined,
            outputDimensionality: this.dimension,
            abortSignal: AbortSignal.timeout(this.timeoutMs),
          },
        });
        const embeddings = response.embeddings ?? [];

        if (embeddings.length !== input.texts.length) {
          throw new Error(
            `Gemini returned ${embeddings.length} embeddings for ${input.texts.length} inputs.`,
          );
        }

        return embeddings.map((embedding) => {
          const values = embedding.values ?? [];

          if (
            values.length !== this.dimension ||
            values.some((value) => !Number.isFinite(value))
          ) {
            throw new Error(
              `Gemini embedding must contain ${this.dimension} finite values.`,
            );
          }

          return normalizeEmbedding(values);
        });
      } catch (error) {
        const statusCode = getStatusCode(error);
        const shouldRetry =
          attempt < MAX_ATTEMPTS &&
          statusCode !== undefined &&
          RETRYABLE_STATUS_CODES.has(statusCode);

        if (!shouldRetry) {
          throw new Error("Gemini embedding request failed.", {
            cause: error,
          });
        }

        await this.wait(500 * 2 ** (attempt - 1));
      }
    }

    throw new Error("Gemini embedding request failed.");
  }
}
