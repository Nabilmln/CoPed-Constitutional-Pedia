import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

import {
  countDocumentChunks,
  createDocumentForIngestion,
  findDocumentByHash,
  insertDocumentChunks,
  markDocumentIngestionFailed,
  markDocumentPendingEmbedding,
  resetDocumentForIngestion,
} from "./document.repository";
import type {
  IngestionPreview,
  IngestionResult,
} from "./document.types";
import { chunkConstitutionalText } from "./constitutional-chunker";
import { parsePdfFile } from "./pdf-parser";

const DEFAULT_TITLE =
  "Undang-Undang Dasar Negara Republik Indonesia Tahun 1945";

const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

export const resolveUudPdfPath = async (requestedPath?: string) => {
  const candidates = [
    requestedPath,
    process.env.UUD_PDF_PATH,
    path.resolve(process.cwd(), "data", "UUD1945.pdf"),
    path.resolve(
      process.cwd(),
      "..",
      "backend",
      "gemini API",
      "data",
      "UUD1945.pdf",
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (await fileExists(resolved)) {
      return resolved;
    }
  }

  throw new Error(
    "UUD1945.pdf was not found. Set UUD_PDF_PATH or place the file in frontend/data/UUD1945.pdf.",
  );
};

export const prepareUudIngestion = async (
  requestedPath?: string,
): Promise<IngestionPreview> => {
  const sourcePath = await resolveUudPdfPath(requestedPath);
  const sourceBuffer = await readFile(sourcePath);
  const contentHash = createHash("sha256").update(sourceBuffer).digest("hex");
  const parsedPdf = await parsePdfFile(sourcePath);
  const sourceFileName = path.basename(sourcePath);
  const chunks = chunkConstitutionalText(parsedPdf.text, sourceFileName);

  if (chunks.length === 0) {
    throw new Error("The UUD PDF did not produce any constitutional chunks.");
  }

  return {
    sourcePath,
    sourceFileName,
    contentHash,
    totalPages: parsedPdf.totalPages,
    extractedCharacters: parsedPdf.characterCount,
    totalChunks: chunks.length,
    chapters: new Set(
      chunks.map((chunk) => chunk.chapter).filter(Boolean),
    ).size,
    articles: new Set(
      chunks.map((chunk) => chunk.articleNumber).filter(Boolean),
    ).size,
    paragraphs: chunks.filter((chunk) => chunk.paragraphNumber).length,
    chunks,
  };
};

type IngestUudOptions = {
  sourcePath?: string;
  title?: string;
  dryRun?: boolean;
  force?: boolean;
};

export const ingestUudDocument = async (
  options: IngestUudOptions = {},
): Promise<IngestionResult> => {
  const preview = await prepareUudIngestion(options.sourcePath);
  const { chunks, ...summary } = preview;

  if (options.dryRun) {
    return { ...summary, status: "preview" };
  }

  const existing = await findDocumentByHash(preview.contentHash);

  if (existing && !options.force) {
    const storedChunks = await countDocumentChunks(existing.id);
    return {
      ...summary,
      documentId: existing.id,
      totalChunks: storedChunks,
      status: "skipped",
    };
  }

  const document =
    existing ??
    (await createDocumentForIngestion({
      title: options.title ?? DEFAULT_TITLE,
      sourcePath: preview.sourceFileName,
      contentHash: preview.contentHash,
      metadata: {
        source: "local_pdf",
        originalFileName: preview.sourceFileName,
        totalPages: preview.totalPages,
        extractedCharacters: preview.extractedCharacters,
      },
    }));

  try {
    if (existing) {
      await resetDocumentForIngestion(existing.id);
    }

    await insertDocumentChunks(
      chunks.map((chunk) => ({
        documentId: document.id,
        chunkIndex: chunk.chunkIndex,
        chapter: chunk.chapter,
        articleNumber: chunk.articleNumber,
        paragraphNumber: chunk.paragraphNumber,
        content: chunk.content,
        tokenCount: null,
        embedding: null,
        metadata: chunk.metadata,
      })),
    );

    await markDocumentPendingEmbedding(document.id);

    return {
      ...summary,
      documentId: document.id,
      status: "created",
    };
  } catch (error) {
    const safeMessage =
      error instanceof Error ? error.message : "Unknown ingestion error";
    await markDocumentIngestionFailed(document.id, safeMessage);
    throw error;
  }
};
