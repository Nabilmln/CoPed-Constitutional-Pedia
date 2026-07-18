import type { ChunkMetadata } from "@/server/database/schema";

export type ConstitutionalReference = {
  articleNumber: string;
  paragraphNumber?: string;
};

export type RetrievalCandidate = {
  id: string;
  documentId: string;
  chunkIndex: number;
  chapter: string | null;
  articleNumber: string | null;
  paragraphNumber: string | null;
  content: string;
  metadata: ChunkMetadata | null;
  similarity: number;
};

export type RetrievalResult = RetrievalCandidate & {
  lexicalScore: number;
  referenceMatch: boolean;
  score: number;
};

export type RetrieveContextInput = {
  query: string;
  matchCount?: number;
  similarityThreshold?: number;
};

export type RetrieveContextOutput = {
  query: string;
  model: string;
  references: ConstitutionalReference[];
  results: RetrievalResult[];
};
