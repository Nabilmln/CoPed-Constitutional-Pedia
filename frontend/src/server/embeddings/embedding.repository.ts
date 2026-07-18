import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import { documentChunks, documents } from "@/server/database/schema";

export const getDocumentForEmbedding = async (documentId: string) => {
  const database = getDatabase();
  const [document] = await database
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  return document ?? null;
};

export const getDocumentChunksForEmbedding = async (documentId: string) => {
  const database = getDatabase();

  return database
    .select({
      id: documentChunks.id,
      content: documentChunks.content,
      chunkIndex: documentChunks.chunkIndex,
    })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId))
    .orderBy(asc(documentChunks.chunkIndex));
};

export const markDocumentEmbeddingStarted = async (documentId: string) => {
  const database = getDatabase();

  await database
    .update(documents)
    .set({
      status: "processing",
      errorMessage: null,
      processedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
};

export const saveChunkEmbeddings = async (
  values: Array<{ chunkId: string; embedding: number[] }>,
) => {
  const database = getDatabase();

  for (const value of values) {
    await database
      .update(documentChunks)
      .set({ embedding: value.embedding })
      .where(eq(documentChunks.id, value.chunkId));
  }
};

export const markDocumentEmbeddingReady = async (
  documentId: string,
  model: string,
  dimension: number,
) => {
  const database = getDatabase();

  await database
    .update(documents)
    .set({
      status: "ready",
      embeddingModel: model,
      embeddingDimension: dimension,
      errorMessage: null,
      processedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
};

export const markDocumentEmbeddingFailed = async (
  documentId: string,
  message: string,
) => {
  const database = getDatabase();

  await database
    .update(documents)
    .set({
      status: "failed",
      errorMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
};
