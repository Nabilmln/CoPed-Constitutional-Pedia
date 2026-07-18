import assert from "node:assert/strict";
import test from "node:test";

import type { RetrieveContextOutput } from "@/server/retrieval/retrieval.types";

import { answerUudQuestion } from "./rag.service";

const retrievalWithContext: RetrieveContextOutput = {
  query: "Apa isi Pasal 1 ayat 1?",
  model: "embedding-model",
  references: [{ articleNumber: "1", paragraphNumber: "1" }],
  results: [
    {
      id: "chunk-1",
      documentId: "document-1",
      chunkIndex: 0,
      chapter: "BAB I",
      articleNumber: "1",
      paragraphNumber: "1",
      content:
        "Pasal 1 ayat (1): Negara Indonesia ialah Negara Kesatuan, yang berbentuk Republik.",
      metadata: null,
      similarity: 0.9,
      lexicalScore: 0.8,
      referenceMatch: true,
      score: 1,
    },
  ],
};

test("out-of-domain questions stop before retrieval and generation", async () => {
  let retrievalCalled = false;
  let providerCalled = false;
  const response = await answerUudQuestion("Buatkan website React.", {
    retrieve: async () => {
      retrievalCalled = true;
      return retrievalWithContext;
    },
    answerProvider: {
      provider: "gemini",
      model: "test-model",
      generateAnswer: async () => {
        providerCalled = true;
        return "Tidak boleh dipanggil.";
      },
    },
  });

  assert.equal(response.status, "rejected");
  assert.equal(retrievalCalled, false);
  assert.equal(providerCalled, false);
});

test("empty retrieval returns no_context without generation", async () => {
  let providerCalled = false;
  const response = await answerUudQuestion("Apa isi UUD 1945?", {
    retrieve: async () => ({
      ...retrievalWithContext,
      results: [],
    }),
    answerProvider: {
      provider: "gemini",
      model: "test-model",
      generateAnswer: async () => {
        providerCalled = true;
        return "Tidak boleh dipanggil.";
      },
    },
  });

  assert.equal(response.status, "no_context");
  assert.equal(response.sources.length, 0);
  assert.equal(providerCalled, false);
});

test("valid grounded question returns answer and deterministic sources", async () => {
  let receivedContext = "";
  const response = await answerUudQuestion("Apa isi Pasal 1 ayat 1?", {
    retrieve: async () => retrievalWithContext,
    answerProvider: {
      provider: "gemini",
      model: "test-model",
      generateAnswer: async ({ context }) => {
        receivedContext = context;
        return "Indonesia adalah negara kesatuan berbentuk republik.";
      },
    },
  });

  assert.equal(response.status, "answered");
  assert.equal(response.provider, "gemini");
  assert.equal(response.model, "test-model");
  assert.equal(response.sources[0].articleNumber, "1");
  assert.match(receivedContext, /Pasal 1 ayat \(1\)/);
});
