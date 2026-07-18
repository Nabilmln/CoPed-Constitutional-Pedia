import type { ConstitutionalChunk } from "./document.types";

const CHAPTER_PATTERN = /^BAB\s+([IVXLCDM]+[A-Z]?)$/i;
const ARTICLE_PATTERN = /^Pasal\s*(\d+[A-Z]?)$/i;
const PARAGRAPH_PATTERN = /^\((\d+[A-Z]?)\)\s*(.*)$/i;
const FOOTER_PATTERN = /^www\.peraturan\.go\.id$/i;
const DOCUMENT_HEADING_PATTERN =
  /^(UNDANG-UNDANG DASAR(?: NEGARA REPUBLIK INDONESIA)?|TAHUN 1945)$/i;
const PREAMBLE_LABEL_PATTERN = /^(PEMBUKAAN|\(\s*P\s*r\s*e\s*a\s*m\s*b\s*u\s*l\s*e\s*\))$/i;

type ChunkContext = {
  chapterRoman: string | null;
  chapterTitle: string | null;
  articleNumber: string | null;
  paragraphNumber: string | null;
  section: "preamble" | "article";
};

type ChunkDraft = ChunkContext & {
  content: string;
};

const normalizeLine = (line: string): string =>
  line
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\((\d+[A-Z]?)\)(?=\S)/i, "($1) ")
    .trim();

export const normalizeConstitutionalText = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line.length > 0 && !FOOTER_PATTERN.test(line));

const repairKnownPdfOrdering = (lines: string[]): string[] => {
  const articleElevenStart = lines.findIndex((line) =>
    line.startsWith(
      "Presiden dengan persetujuan Dewan Perwakilan Rakyat menyatakan perang",
    ),
  );
  const articleElevenHeading = lines.findIndex((line) =>
    /^Pasal\s*11$/i.test(line),
  );

  if (articleElevenStart === -1 || articleElevenHeading === -1) {
    return lines;
  }

  let articleElevenEnd = articleElevenStart;
  while (
    articleElevenEnd < lines.length - 1 &&
    !/negara lain\.$/i.test(lines[articleElevenEnd])
  ) {
    articleElevenEnd += 1;
  }

  if (!/negara lain\.$/i.test(lines[articleElevenEnd])) {
    return lines;
  }

  const repaired = [...lines];
  const articleElevenContent = repaired.splice(
    articleElevenStart,
    articleElevenEnd - articleElevenStart + 1,
  );
  const adjustedHeading = repaired.findIndex((line) =>
    /^Pasal\s*11$/i.test(line),
  );

  repaired.splice(adjustedHeading + 1, 0, ...articleElevenContent);
  return repaired;
};

const splitLongContent = (content: string, maxCharacters: number): string[] => {
  if (content.length <= maxCharacters) {
    return [content];
  }

  const sentences = content.split(/(?<=[.!?;:])\s+/);
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!sentence) {
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= maxCharacters) {
      current = candidate;
      continue;
    }

    if (current) {
      parts.push(current);
      current = "";
    }

    if (sentence.length <= maxCharacters) {
      current = sentence;
      continue;
    }

    for (let index = 0; index < sentence.length; index += maxCharacters) {
      parts.push(sentence.slice(index, index + maxCharacters).trim());
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts.filter(Boolean);
};

const buildChunkContent = (
  context: ChunkContext,
  body: string,
  part?: number,
): string => {
  if (context.section === "preamble") {
    return part
      ? `Pembukaan UUD 1945 (bagian ${part}): ${body}`
      : `Pembukaan UUD 1945: ${body}`;
  }

  const citation = [
    context.chapterRoman ? `BAB ${context.chapterRoman}` : null,
    context.chapterTitle,
    context.articleNumber ? `Pasal ${context.articleNumber}` : null,
    context.paragraphNumber ? `ayat (${context.paragraphNumber})` : null,
  ]
    .filter(Boolean)
    .join(" — ");

  return part
    ? `${citation} (bagian ${part}): ${body}`
    : `${citation}: ${body}`;
};

export const chunkConstitutionalText = (
  text: string,
  source = "UUD1945.pdf",
  maxCharacters = 1600,
): ConstitutionalChunk[] => {
  const lines = repairKnownPdfOrdering(normalizeConstitutionalText(text));
  const drafts: ChunkDraft[] = [];
  let context: ChunkContext = {
    chapterRoman: null,
    chapterTitle: null,
    articleNumber: null,
    paragraphNumber: null,
    section: "preamble",
  };
  let contentLines: string[] = [];
  let expectsChapterTitle = false;

  const flush = () => {
    const content = contentLines.join(" ").replace(/\s+/g, " ").trim();

    if (content) {
      drafts.push({ ...context, content });
    }

    contentLines = [];
  };

  for (const line of lines) {
    const chapterMatch = line.match(CHAPTER_PATTERN);
    if (chapterMatch) {
      flush();
      context = {
        chapterRoman: chapterMatch[1].toUpperCase(),
        chapterTitle: null,
        articleNumber: null,
        paragraphNumber: null,
        section: "article",
      };
      expectsChapterTitle = true;
      continue;
    }

    const articleMatch = line.match(ARTICLE_PATTERN);
    if (articleMatch) {
      flush();
      context = {
        ...context,
        articleNumber: articleMatch[1].toUpperCase(),
        paragraphNumber: null,
        section: "article",
      };
      expectsChapterTitle = false;
      continue;
    }

    const paragraphMatch = line.match(PARAGRAPH_PATTERN);
    if (paragraphMatch && context.articleNumber) {
      flush();
      context = {
        ...context,
        paragraphNumber: paragraphMatch[1].toUpperCase(),
      };
      if (paragraphMatch[2]) {
        contentLines.push(paragraphMatch[2]);
      }
      continue;
    }

    if (expectsChapterTitle) {
      context = { ...context, chapterTitle: line };
      expectsChapterTitle = false;
      continue;
    }

    if (
      DOCUMENT_HEADING_PATTERN.test(line) ||
      PREAMBLE_LABEL_PATTERN.test(line)
    ) {
      continue;
    }

    contentLines.push(line);
  }

  flush();

  const chunks: ConstitutionalChunk[] = [];

  for (const draft of drafts) {
    const parts = splitLongContent(draft.content, maxCharacters);

    parts.forEach((part, partIndex) => {
      const partNumber = parts.length > 1 ? partIndex + 1 : undefined;
      const content = buildChunkContent(draft, part, partNumber);

      chunks.push({
        chunkIndex: chunks.length,
        chapter: draft.chapterRoman,
        chapterTitle: draft.chapterTitle,
        articleNumber: draft.articleNumber,
        paragraphNumber: draft.paragraphNumber,
        content,
        characterCount: content.length,
        metadata: {
          section: draft.section,
          ...(draft.chapterRoman
            ? { chapterRoman: draft.chapterRoman }
            : {}),
          ...(draft.chapterTitle ? { chapterTitle: draft.chapterTitle } : {}),
          ...(draft.articleNumber ? { article: draft.articleNumber } : {}),
          ...(draft.paragraphNumber
            ? { paragraph: draft.paragraphNumber }
            : {}),
          ...(partNumber ? { part: partNumber } : {}),
          source,
        },
      });
    });
  }

  return chunks;
};
