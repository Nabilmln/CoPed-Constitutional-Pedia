import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "@google/genai";

import {
  GeminiEmbeddingProvider,
  normalizeEmbedding,
} from "./gemini-embedding.provider";

const createVector = (dimension: number, value = 1) =>
  Array.from({ length: dimension }, () => value);

test("normalizeEmbedding produces an L2-normalized vector", () => {
  assert.deepEqual(normalizeEmbedding([3, 4]), [0.6, 0.8]);
});

test("Gemini provider sends retrieval document configuration", async () => {
  let capturedTask = "";
  let capturedTitle: string | undefined;
  let capturedDimension = 0;
  let capturedSignal: AbortSignal | undefined;
  const provider = new GeminiEmbeddingProvider({
    model: "test-model",
    dimension: 3,
    client: {
      models: {
        embedContent: async (input) => {
          capturedTask = input.config.taskType;
          capturedTitle = input.config.title;
          capturedDimension = input.config.outputDimensionality;
          capturedSignal = input.config.abortSignal;
          return { embeddings: [{ values: createVector(3) }] };
        },
      },
    },
  });

  const [embedding] = await provider.embedTexts({
    texts: ["Pasal 1 ayat (1) Negara Indonesia ialah Negara Kesatuan."],
    task: "document",
    title: "UUD 1945",
  });

  assert.equal(capturedTask, "RETRIEVAL_DOCUMENT");
  assert.equal(capturedTitle, "UUD 1945");
  assert.equal(capturedDimension, 3);
  assert.ok(capturedSignal instanceof AbortSignal);
  assert.ok(
    Math.abs(
      Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0)) -
        1,
    ) < 1e-12,
  );
});

test("Gemini provider uses retrieval query task without a title", async () => {
  let capturedTitle: string | undefined = "unexpected";
  let capturedTask = "";
  const provider = new GeminiEmbeddingProvider({
    model: "test-model",
    dimension: 3,
    client: {
      models: {
        embedContent: async (input) => {
          capturedTask = input.config.taskType;
          capturedTitle = input.config.title;
          return { embeddings: [{ values: createVector(3) }] };
        },
      },
    },
  });

  await provider.embedTexts({
    texts: ["Apa isi Pasal 1 ayat (1)?"],
    task: "query",
  });

  assert.equal(capturedTask, "RETRIEVAL_QUERY");
  assert.equal(capturedTitle, undefined);
});

test("Gemini provider retries rate-limited requests", async () => {
  let attempts = 0;
  const waits: number[] = [];
  const provider = new GeminiEmbeddingProvider({
    model: "test-model",
    dimension: 3,
    sleep: async (durationMs) => {
      waits.push(durationMs);
    },
    client: {
      models: {
        embedContent: async () => {
          attempts += 1;

          if (attempts < 3) {
            throw new ApiError({ status: 429, message: "Rate limited" });
          }

          return { embeddings: [{ values: createVector(3) }] };
        },
      },
    },
  });

  await provider.embedTexts({ texts: ["Pasal 1"], task: "document" });

  assert.equal(attempts, 3);
  assert.deepEqual(waits, [500, 1000]);
});

test("Gemini provider rejects a vector with an unexpected dimension", async () => {
  const provider = new GeminiEmbeddingProvider({
    model: "test-model",
    dimension: 3,
    client: {
      models: {
        embedContent: async () => ({
          embeddings: [{ values: createVector(2) }],
        }),
      },
    },
  });

  await assert.rejects(
    provider.embedTexts({ texts: ["Pasal 1"], task: "document" }),
    /Gemini embedding request failed/,
  );
});
