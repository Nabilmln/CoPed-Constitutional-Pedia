import { retrieveUudContext } from "@/server/retrieval/retrieval.service";
import type {
  RetrieveContextInput,
  RetrieveContextOutput,
} from "@/server/retrieval/retrieval.types";

import { buildRagContext } from "./context-builder";
import { evaluateQuestionDomain } from "./domain-guard";
import { GeminiAnswerProvider } from "./gemini-answer.provider";
import type {
  AnswerProvider,
  RagAnswer,
} from "./rag.types";

const REJECTED_MESSAGE =
  "Maaf, saya hanya dapat membantu pertanyaan yang berkaitan dengan UUD 1945.";
const NO_CONTEXT_MESSAGE =
  "Informasi tersebut tidak ditemukan dalam dokumen UUD 1945 yang tersedia.";

type RagDependencies = {
  answerProvider?: AnswerProvider;
  retrieve?: (
    input: RetrieveContextInput,
  ) => Promise<RetrieveContextOutput>;
};

export const answerUudQuestion = async (
  question: string,
  dependencies: RagDependencies = {},
): Promise<RagAnswer> => {
  const normalizedQuestion = question.trim();

  if (normalizedQuestion.length < 3 || normalizedQuestion.length > 500) {
    throw new Error("Question must contain between 3 and 500 characters.");
  }

  const guard = evaluateQuestionDomain(normalizedQuestion);

  if (!guard.allowed) {
    return {
      answer: REJECTED_MESSAGE,
      status: "rejected",
      sources: [],
      provider: "system",
    };
  }

  const retrieve = dependencies.retrieve ?? retrieveUudContext;
  const retrieval = await retrieve({ query: normalizedQuestion });

  if (retrieval.results.length === 0) {
    return {
      answer: NO_CONTEXT_MESSAGE,
      status: "no_context",
      sources: [],
      provider: "system",
    };
  }

  const context = buildRagContext(retrieval.results);

  if (!context.text) {
    return {
      answer: NO_CONTEXT_MESSAGE,
      status: "no_context",
      sources: [],
      provider: "system",
    };
  }

  const answerProvider =
    dependencies.answerProvider ?? new GeminiAnswerProvider();
  const answer = await answerProvider.generateAnswer({
    question: normalizedQuestion,
    context: context.text,
  });

  return {
    answer,
    status: "answered",
    sources: context.sources,
    provider: answerProvider.provider,
    model: answerProvider.model,
  };
};
