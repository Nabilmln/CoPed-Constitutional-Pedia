export type EmbeddingTask = "document" | "query";

export type EmbedTextsInput = {
  texts: string[];
  task: EmbeddingTask;
  title?: string;
};

export type EmbeddingProvider = {
  readonly model: string;
  readonly dimension: number;
  embedTexts(input: EmbedTextsInput): Promise<number[][]>;
};

export type EmbedDocumentResult = {
  documentId: string;
  model: string;
  dimension: number;
  totalChunks: number;
  embeddedChunks: number;
  status: "ready";
};
