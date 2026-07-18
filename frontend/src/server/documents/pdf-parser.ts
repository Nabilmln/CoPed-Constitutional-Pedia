import { readFile } from "node:fs/promises";

import pdf from "pdf-parse";

import type { ParsedPdf } from "./document.types";

const PDF_SIGNATURE = "%PDF";

export const parsePdfFile = async (filePath: string): Promise<ParsedPdf> => {
  const buffer = await readFile(filePath);

  if (buffer.subarray(0, PDF_SIGNATURE.length).toString() !== PDF_SIGNATURE) {
    throw new Error("The configured UUD source is not a valid PDF file.");
  }

  const parsed = await pdf(buffer);
  const text = parsed.text.trim();

  if (!text) {
    throw new Error("No text could be extracted from the UUD PDF.");
  }

  return {
    text,
    totalPages: parsed.numpages,
    characterCount: text.length,
  };
};
