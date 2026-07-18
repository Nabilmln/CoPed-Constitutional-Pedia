import type { RetrievalResult } from "@/server/retrieval/retrieval.types";

import type { BuiltContext, RagSource } from "./rag.types";

const MAX_CONTEXT_CHARACTERS = 6_000;
const MAX_CONTEXT_CHUNKS = 5;
const MAX_EXCERPT_CHARACTERS = 320;

const formatCitation = (result: RetrievalResult) => {
  if (!result.articleNumber) {
    return "Pembukaan UUD 1945";
  }

  return result.paragraphNumber
    ? `Pasal ${result.articleNumber} ayat (${result.paragraphNumber})`
    : `Pasal ${result.articleNumber}`;
};

const toSource = (result: RetrievalResult): RagSource => ({
  chunkId: result.id,
  articleNumber: result.articleNumber,
  paragraphNumber: result.paragraphNumber,
  chapter: result.chapter,
  excerpt:
    result.content.length > MAX_EXCERPT_CHARACTERS
      ? `${result.content.slice(0, MAX_EXCERPT_CHARACTERS).trim()}…`
      : result.content,
  score: result.score,
});

export const buildRagContext = (
  results: RetrievalResult[],
): BuiltContext => {
  const selected: RetrievalResult[] = [];
  const sections: string[] = [];
  let totalCharacters = 0;

  for (const result of results.slice(0, MAX_CONTEXT_CHUNKS)) {
    const section = `[S${selected.length + 1}] ${formatCitation(result)}\n${result.content}`;

    if (
      selected.length > 0 &&
      totalCharacters + section.length > MAX_CONTEXT_CHARACTERS
    ) {
      break;
    }

    const remainingCharacters = MAX_CONTEXT_CHARACTERS - totalCharacters;
    const boundedSection =
      section.length > remainingCharacters
        ? section.slice(0, remainingCharacters)
        : section;

    selected.push(result);
    sections.push(boundedSection);
    totalCharacters += boundedSection.length;
  }

  return {
    text: sections.join("\n\n"),
    sources: selected.map(toSource),
    chunks: selected,
  };
};
