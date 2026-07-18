import assert from "node:assert/strict";
import test from "node:test";

import { ApiError } from "@google/genai";

import { GeminiAnswerProvider } from "./gemini-answer.provider";

test("Gemini answer provider sends grounded low-temperature prompt", async () => {
  let capturedContents = "";
  let capturedSystemInstruction = "";
  let capturedTemperature = -1;
  let capturedSignal: AbortSignal | undefined;
  const provider = new GeminiAnswerProvider({
    model: "test-model",
    client: {
      models: {
        generateContent: async (input) => {
          capturedContents = input.contents;
          capturedSystemInstruction = input.config.systemInstruction;
          capturedTemperature = input.config.temperature;
          capturedSignal = input.config.abortSignal;
          return { text: "Pasal 1 ayat (1) menyatakan Indonesia negara kesatuan." };
        },
      },
    },
  });

  const answer = await provider.generateAnswer({
    question: "Apa isi Pasal 1 ayat 1?",
    context: "[S1] Pasal 1 ayat (1)\nNegara Indonesia ialah Negara Kesatuan.",
  });

  assert.match(capturedContents, /KONTEKS TERVERIFIKASI/);
  assert.match(capturedSystemInstruction, /hanya berdasarkan KONTEKS/i);
  assert.equal(capturedTemperature, 0.1);
  assert.ok(capturedSignal instanceof AbortSignal);
  assert.match(answer, /Pasal 1/);
});

test("Gemini answer provider retries transient errors", async () => {
  let attempts = 0;
  const waits: number[] = [];
  const provider = new GeminiAnswerProvider({
    model: "test-model",
    sleep: async (durationMs) => {
      waits.push(durationMs);
    },
    client: {
      models: {
        generateContent: async () => {
          attempts += 1;

          if (attempts === 1) {
            throw new ApiError({ status: 429, message: "Rate limited" });
          }

          return { text: "Jawaban berhasil." };
        },
      },
    },
  });

  assert.equal(
    await provider.generateAnswer({
      question: "Apa itu UUD 1945?",
      context: "Konteks.",
    }),
    "Jawaban berhasil.",
  );
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [500]);
});

test("Gemini answer provider rejects an empty response", async () => {
  const provider = new GeminiAnswerProvider({
    model: "test-model",
    client: {
      models: {
        generateContent: async () => ({ text: "  " }),
      },
    },
  });

  await assert.rejects(
    provider.generateAnswer({
      question: "Apa itu UUD 1945?",
      context: "Konteks.",
    }),
    /Gemini answer generation failed/,
  );
});
