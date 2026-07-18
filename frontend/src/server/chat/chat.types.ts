import type { RagAnswer, RagSource } from "@/server/rag/rag.types";

export type ChatRequest = {
  sessionId?: string;
  message: string;
};

export type ChatResponse = {
  sessionId: string;
  answer: string;
  status: RagAnswer["status"];
  sources: RagSource[];
  provider: RagAnswer["provider"];
  model?: string;
};

export type PersistedAssistantAnswer = RagAnswer & {
  latencyMs: number;
};
