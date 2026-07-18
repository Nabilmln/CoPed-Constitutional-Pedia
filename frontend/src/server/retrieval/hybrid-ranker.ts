import type {
  ConstitutionalReference,
  RetrievalCandidate,
  RetrievalResult,
} from "./retrieval.types";

const STOP_WORDS = new Set([
  "apa",
  "apakah",
  "bagaimana",
  "berapa",
  "dan",
  "dalam",
  "di",
  "isi",
  "itu",
  "ke",
  "menurut",
  "pada",
  "sebagai",
  "siapa",
  "tahun",
  "tentang",
  "terkait",
  "uud",
  "yang",
]);

const normalizeToken = (token: string) =>
  token.startsWith("ber") && token.length > 5 ? token.slice(3) : token;

export const normalizeReferencePart = (value: string) =>
  value.replace(/^0+/, "").toUpperCase() || "0";

export const extractConstitutionalReferences = (
  query: string,
): ConstitutionalReference[] => {
  const references: ConstitutionalReference[] = [];
  const pattern =
    /pasal\s+(\d+[a-z]?)(?:\s*(?:ayat)?\s*\(?(\d+[a-z]?)\)?)?/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(query)) !== null) {
    references.push({
      articleNumber: normalizeReferencePart(match[1]),
      paragraphNumber: match[2]
        ? normalizeReferencePart(match[2])
        : undefined,
    });
  }

  return references;
};

const tokenize = (value: string) =>
  new Set(
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
      .map(normalizeToken),
  );

export const calculateLexicalScore = (query: string, content: string) => {
  const queryTokens = tokenize(query);

  if (queryTokens.size === 0) {
    return 0;
  }

  const contentTokens = tokenize(content);
  let matches = 0;

  for (const token of queryTokens) {
    if (contentTokens.has(token)) {
      matches += 1;
    }
  }

  return matches / queryTokens.size;
};

const matchesReference = (
  candidate: RetrievalCandidate,
  reference: ConstitutionalReference,
) => {
  if (
    !candidate.articleNumber ||
    normalizeReferencePart(candidate.articleNumber) !==
      reference.articleNumber
  ) {
    return false;
  }

  return (
    !reference.paragraphNumber ||
    (candidate.paragraphNumber !== null &&
      normalizeReferencePart(candidate.paragraphNumber) ===
        reference.paragraphNumber)
  );
};

export const rankHybridCandidates = (
  query: string,
  candidates: RetrievalCandidate[],
  references = extractConstitutionalReferences(query),
): RetrievalResult[] =>
  candidates
    .map((candidate) => {
      const lexicalScore = calculateLexicalScore(query, candidate.content);
      const referenceMatch = references.some((reference) =>
        matchesReference(candidate, reference),
      );
      const score = Math.min(
        1,
        candidate.similarity * 0.78 +
          lexicalScore * 0.22 +
          (referenceMatch ? 0.35 : 0),
      );

      return {
        ...candidate,
        lexicalScore,
        referenceMatch,
        score,
      };
    })
    .sort(
      (left, right) =>
        Number(right.referenceMatch) - Number(left.referenceMatch) ||
        right.score - left.score ||
        left.chunkIndex - right.chunkIndex,
    );
