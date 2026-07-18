import assert from "node:assert/strict";
import test from "node:test";

import { buildRagContext } from "./context-builder";
import type { RetrievalResult } from "@/server/retrieval/retrieval.types";

const result = (
  index: number,
  overrides: Partial<RetrievalResult> = {},
): RetrievalResult => ({
  id: `chunk-${index}`,
  documentId: "document-1",
  chunkIndex: index,
  chapter: "BAB I",
  articleNumber: String(index + 1),
  paragraphNumber: "1",
  content: `Pasal ${index + 1} ayat (1): Isi konstitusi ${index}.`,
  metadata: null,
  similarity: 0.7,
  lexicalScore: 0.5,
  referenceMatch: false,
  score: 0.65,
  ...overrides,
});

test("builds bounded context with deterministic source labels", () => {
  const context = buildRagContext(
    Array.from({ length: 7 }, (_, index) => result(index)),
  );

  assert.equal(context.chunks.length, 5);
  assert.equal(context.sources.length, 5);
  assert.match(context.text, /\[S1\] Pasal 1 ayat \(1\)/);
  assert.match(context.text, /\[S5\] Pasal 5 ayat \(1\)/);
  assert.doesNotMatch(context.text, /\[S6\]/);
});

test("formats preamble sources without inventing an article", () => {
  const context = buildRagContext([
    result(0, {
      articleNumber: null,
      paragraphNumber: null,
      content: "Pembukaan Undang-Undang Dasar 1945.",
    }),
  ]);

  assert.match(context.text, /Pembukaan UUD 1945/);
  assert.equal(context.sources[0].articleNumber, null);
});
