export type ConstitutionalChunk = {
  chunkIndex: number;
  chapter: string | null;
  chapterTitle: string | null;
  articleNumber: string | null;
  paragraphNumber: string | null;
  content: string;
  characterCount: number;
  metadata: {
    section: "preamble" | "article";
    chapterRoman?: string;
    chapterTitle?: string;
    article?: string;
    paragraph?: string;
    part?: number;
    source: string;
  };
};

export type ParsedPdf = {
  text: string;
  totalPages: number;
  characterCount: number;
};

export type IngestionPreview = {
  sourcePath: string;
  sourceFileName: string;
  contentHash: string;
  totalPages: number;
  extractedCharacters: number;
  totalChunks: number;
  chapters: number;
  articles: number;
  paragraphs: number;
  chunks: ConstitutionalChunk[];
};

export type IngestionResult = Omit<IngestionPreview, "chunks"> & {
  documentId?: string;
  status: "preview" | "created" | "skipped";
};
