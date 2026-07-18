import { and, asc, desc, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";

import { getDatabase } from "@/server/database/client";
import { documentChunks, documents } from "@/server/database/schema";

import type {
  ConstitutionalReference,
  RetrievalCandidate,
} from "./retrieval.types";

const candidateSelection = {
  id: documentChunks.id,
  documentId: documentChunks.documentId,
  chunkIndex: documentChunks.chunkIndex,
  chapter: documentChunks.chapter,
  articleNumber: documentChunks.articleNumber,
  paragraphNumber: documentChunks.paragraphNumber,
  content: documentChunks.content,
  metadata: documentChunks.metadata,
};

export const findVectorCandidates = async (
  queryEmbedding: number[],
  candidateCount: number,
): Promise<RetrievalCandidate[]> => {
  const database = getDatabase();
  const distance = cosineDistance(documentChunks.embedding, queryEmbedding);
  const similarity = sql<number>`1 - (${distance})`;
  const rows = await database
    .select({ ...candidateSelection, similarity })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(
      and(
        eq(documents.isActive, true),
        eq(documents.status, "ready"),
        isNotNull(documentChunks.embedding),
      ),
    )
    .orderBy(desc(similarity))
    .limit(candidateCount);

  return rows.map((row) => ({
    ...row,
    similarity: Number(row.similarity),
  }));
};

export const findReferenceCandidates = async (
  references: ConstitutionalReference[],
): Promise<RetrievalCandidate[]> => {
  if (references.length === 0) {
    return [];
  }

  const database = getDatabase();
  const conditions = references.map((reference) =>
    reference.paragraphNumber
      ? and(
          eq(documentChunks.articleNumber, reference.articleNumber),
          eq(documentChunks.paragraphNumber, reference.paragraphNumber),
        )
      : eq(documentChunks.articleNumber, reference.articleNumber),
  );
  const rows = await database
    .select(candidateSelection)
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(
      and(
        eq(documents.isActive, true),
        eq(documents.status, "ready"),
        or(...conditions),
      ),
    )
    .orderBy(asc(documentChunks.chunkIndex));

  return rows.map((row) => ({ ...row, similarity: 0 }));
};

export const hydrateCandidateSimilarities = async (
  candidateIds: string[],
  queryEmbedding: number[],
): Promise<Map<string, number>> => {
  if (candidateIds.length === 0) {
    return new Map();
  }

  const database = getDatabase();
  const distance = cosineDistance(documentChunks.embedding, queryEmbedding);
  const rows = await database
    .select({
      id: documentChunks.id,
      similarity: sql<number>`1 - (${distance})`,
    })
    .from(documentChunks)
    .where(
      and(
        inArray(documentChunks.id, candidateIds),
        isNotNull(documentChunks.embedding),
      ),
    );

  return new Map(
    rows.map((row) => [row.id, Number(row.similarity)] as const),
  );
};
