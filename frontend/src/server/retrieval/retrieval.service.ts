import { getRagEnv } from "@/server/config/env";
import { GeminiEmbeddingProvider } from "@/server/embeddings/gemini-embedding.provider";
import type { EmbeddingProvider } from "@/server/embeddings/embedding.types";

import {
  extractConstitutionalReferences,
  rankHybridCandidates,
} from "./hybrid-ranker";
import {
  findReferenceCandidates,
  findVectorCandidates,
  hydrateCandidateSimilarities,
} from "./retrieval.repository";
import type {
  RetrievalCandidate,
  RetrieveContextInput,
  RetrieveContextOutput,
} from "./retrieval.types";

type RetrievalDependencies = {
  provider?: EmbeddingProvider;
};

const mergeCandidates = (
  vectorCandidates: RetrievalCandidate[],
  referenceCandidates: RetrievalCandidate[],
  hydratedSimilarities: Map<string, number>,
) => {
  const merged = new Map<string, RetrievalCandidate>();

  for (const candidate of [...vectorCandidates, ...referenceCandidates]) {
    const existing = merged.get(candidate.id);
    merged.set(candidate.id, {
      ...(existing ?? candidate),
      similarity:
        existing?.similarity ??
        hydratedSimilarities.get(candidate.id) ??
        candidate.similarity,
    });
  }

  return [...merged.values()];
};

export const retrieveUudContext = async (
  input: RetrieveContextInput,
  dependencies: RetrievalDependencies = {},
): Promise<RetrieveContextOutput> => {
  const query = input.query.trim();

  if (query.length < 3) {
    throw new Error("Retrieval query must contain at least 3 characters.");
  }

  const ragEnv = getRagEnv();
  const matchCount = input.matchCount ?? ragEnv.RAG_MATCH_COUNT;
  const similarityThreshold =
    input.similarityThreshold ?? ragEnv.RAG_SIMILARITY_THRESHOLD;
  const provider = dependencies.provider ?? new GeminiEmbeddingProvider();
  const [queryEmbedding] = await provider.embedTexts({
    texts: [query],
    task: "query",
  });
  const references = extractConstitutionalReferences(query);
  const [vectorCandidates, referenceCandidates] = await Promise.all([
    findVectorCandidates(queryEmbedding, Math.min(matchCount * 4, 40)),
    findReferenceCandidates(references),
  ]);
  const vectorCandidateIds = new Set(
    vectorCandidates.map((candidate) => candidate.id),
  );
  const missingReferenceIds = referenceCandidates
    .filter((candidate) => !vectorCandidateIds.has(candidate.id))
    .map((candidate) => candidate.id);
  const hydratedSimilarities = await hydrateCandidateSimilarities(
    missingReferenceIds,
    queryEmbedding,
  );
  const candidates = mergeCandidates(
    vectorCandidates,
    referenceCandidates,
    hydratedSimilarities,
  );
  const results = rankHybridCandidates(query, candidates, references)
    .filter(
      (candidate) =>
        candidate.referenceMatch ||
        candidate.similarity >= similarityThreshold,
    )
    .slice(0, matchCount);

  return {
    query,
    model: provider.model,
    references,
    results,
  };
};
