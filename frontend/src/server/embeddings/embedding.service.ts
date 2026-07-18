import { getEmbeddingEnv } from "@/server/config/env";

import {
  getDocumentChunksForEmbedding,
  getDocumentForEmbedding,
  markDocumentEmbeddingFailed,
  markDocumentEmbeddingReady,
  markDocumentEmbeddingStarted,
  saveChunkEmbeddings,
} from "./embedding.repository";
import { GeminiEmbeddingProvider } from "./gemini-embedding.provider";
import type {
  EmbedDocumentResult,
  EmbeddingProvider,
} from "./embedding.types";

type EmbedDocumentOptions = {
  provider?: EmbeddingProvider;
  batchSize?: number;
};

const safeEmbeddingError = (error: unknown) => {
  if (error instanceof Error && error.message.includes("not found")) {
    return error.message;
  }

  return "Document embedding failed. Check the server logs.";
};

export const embedDocument = async (
  documentId: string,
  options: EmbedDocumentOptions = {},
): Promise<EmbedDocumentResult> => {
  const document = await getDocumentForEmbedding(documentId);

  if (!document) {
    throw new Error("Document not found.");
  }

  const chunks = await getDocumentChunksForEmbedding(documentId);

  if (chunks.length === 0) {
    throw new Error("Document does not contain chunks.");
  }

  const provider = options.provider ?? new GeminiEmbeddingProvider();
  const configuredBatchSize = options.provider
    ? 8
    : getEmbeddingEnv().GEMINI_EMBEDDING_BATCH_SIZE;
  const batchSize = options.batchSize ?? configuredBatchSize;
  let embeddedChunks = 0;

  await markDocumentEmbeddingStarted(documentId);

  try {
    for (let index = 0; index < chunks.length; index += batchSize) {
      const batch = chunks.slice(index, index + batchSize);
      const embeddings = await provider.embedTexts({
        texts: batch.map((chunk) => chunk.content),
        task: "document",
        title: document.title,
      });

      await saveChunkEmbeddings(
        batch.map((chunk, batchIndex) => ({
          chunkId: chunk.id,
          embedding: embeddings[batchIndex],
        })),
      );
      embeddedChunks += batch.length;
    }

    await markDocumentEmbeddingReady(
      documentId,
      provider.model,
      provider.dimension,
    );

    return {
      documentId,
      model: provider.model,
      dimension: provider.dimension,
      totalChunks: chunks.length,
      embeddedChunks,
      status: "ready",
    };
  } catch (error) {
    console.error("Document embedding failed.", {
      documentId,
      model: provider.model,
      reason: error instanceof Error ? error.message : "Unknown error",
    });
    await markDocumentEmbeddingFailed(
      documentId,
      safeEmbeddingError(error),
    );
    throw error;
  }
};
