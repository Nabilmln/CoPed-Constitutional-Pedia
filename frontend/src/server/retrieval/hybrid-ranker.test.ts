import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateLexicalScore,
  extractConstitutionalReferences,
  rankHybridCandidates,
} from "./hybrid-ranker";
import type { RetrievalCandidate } from "./retrieval.types";

const candidate = (
  overrides: Partial<RetrievalCandidate>,
): RetrievalCandidate => ({
  id: "chunk-1",
  documentId: "document-1",
  chunkIndex: 0,
  chapter: null,
  articleNumber: null,
  paragraphNumber: null,
  content: "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945",
  metadata: null,
  similarity: 0.5,
  ...overrides,
});

test("extracts Pasal and ayat references from Indonesian queries", () => {
  assert.deepEqual(
    extractConstitutionalReferences(
      "Bandingkan Pasal 1 ayat (2) dengan Pasal 27 ayat 1.",
    ),
    [
      { articleNumber: "1", paragraphNumber: "2" },
      { articleNumber: "27", paragraphNumber: "1" },
    ],
  );
});

test("calculates lexical token overlap without common stop words", () => {
  const score = calculateLexicalScore(
    "Apa hak warga negara terkait pendidikan?",
    "Setiap warga negara berhak mendapat pendidikan.",
  );

  assert.equal(score, 1);
});

test("exact constitutional references outrank a higher vector similarity", () => {
  const results = rankHybridCandidates(
    "Apa isi Pasal 27 ayat 1?",
    [
      candidate({
        id: "semantic",
        articleNumber: "28",
        paragraphNumber: "1",
        similarity: 0.92,
      }),
      candidate({
        id: "exact",
        articleNumber: "27",
        paragraphNumber: "1",
        similarity: 0.45,
      }),
    ],
  );

  assert.equal(results[0].id, "exact");
  assert.equal(results[0].referenceMatch, true);
});

test("hybrid ranking uses lexical relevance as a tie breaker", () => {
  const results = rankHybridCandidates("kebebasan memeluk agama", [
    candidate({
      id: "education",
      content: "Setiap warga negara berhak mendapat pendidikan.",
      similarity: 0.6,
    }),
    candidate({
      id: "religion",
      content: "Setiap orang bebas memeluk agama dan beribadat.",
      similarity: 0.6,
    }),
  ]);

  assert.equal(results[0].id, "religion");
  assert.ok(results[0].lexicalScore > results[1].lexicalScore);
});
