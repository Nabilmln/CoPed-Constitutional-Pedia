import type { RetrievalResult } from "@/server/retrieval/retrieval.types";

export type RagStatus =
  | "answered"
  | "rejected"
  | "no_context"
  | "error";

export type RagSource = {
  chunkId: string;
  articleNumber: string | null;
  paragraphNumber: string | null;
  chapter: string | null;
  excerpt: string;
  score: number;
};

export type RagAnswer = {
  answer: string;
  status: RagStatus;
  sources: RagSource[];
  provider: "gemini" | "system";
  model?: string;
};

export type AnswerProviderInput = {
  question: string;
  context: string;
};

export type AnswerProvider = {
  readonly provider: "gemini";
  readonly model: string;
  generateAnswer(input: AnswerProviderInput): Promise<string>;
};

export type BuiltContext = {
  text: string;
  sources: RagSource[];
  chunks: RetrievalResult[];
};
