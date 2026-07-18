import { count, eq } from "drizzle-orm";

import { getDatabase } from "@/server/database/client";
import {
  documentChunks,
  documents,
  type NewDocumentChunk,
} from "@/server/database/schema";

type CreateDocumentInput = {
  title: string;
  sourcePath: string;
  contentHash: string;
  metadata: {
    source: string;
    originalFileName: string;
    totalPages: number;
    extractedCharacters: number;
  };
};

export const findDocumentByHash = async (contentHash: string) => {
  const database = getDatabase();
  const [document] = await database
    .select()
    .from(documents)
    .where(eq(documents.contentHash, contentHash))
    .limit(1);

  return document ?? null;
};

export const createDocumentForIngestion = async (
  input: CreateDocumentInput,
) => {
  const database = getDatabase();
  const [document] = await database
    .insert(documents)
    .values({
      ...input,
      status: "processing",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .returning();

  return document;
};

export const resetDocumentForIngestion = async (documentId: string) => {
  const database = getDatabase();

  await database
    .delete(documentChunks)
    .where(eq(documentChunks.documentId, documentId));

  await database
    .update(documents)
    .set({
      status: "processing",
      embeddingModel: null,
      embeddingDimension: null,
      errorMessage: null,
      processedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
};

export const insertDocumentChunks = async (
  values: NewDocumentChunk[],
) => {
  if (values.length === 0) {
    throw new Error("At least one document chunk is required.");
  }

  const database = getDatabase();
  const batchSize = 100;

  for (let index = 0; index < values.length; index += batchSize) {
    await database
      .insert(documentChunks)
      .values(values.slice(index, index + batchSize));
  }
};

export const markDocumentPendingEmbedding = async (documentId: string) => {
  const database = getDatabase();

  await database
    .update(documents)
    .set({
      status: "pending",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId));
};

export const markDocumentIngestionFailed = async (
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

export const countDocumentChunks = async (documentId: string) => {
  const database = getDatabase();
  const [result] = await database
    .select({ value: count() })
    .from(documentChunks)
    .where(eq(documentChunks.documentId, documentId));

  return result?.value ?? 0;
};
