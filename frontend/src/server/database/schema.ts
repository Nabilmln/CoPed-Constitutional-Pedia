import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "ready",
  "failed",
]);

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const chatStatusEnum = pgEnum("chat_status", [
  "answered",
  "rejected",
  "no_context",
  "error",
]);

export const feedbackStatusEnum = pgEnum("feedback_status", [
  "new",
  "reviewed",
  "archived",
]);

export type DocumentMetadata = {
  source?: string;
  originalFileName?: string;
  [key: string]: unknown;
};

export type ChunkMetadata = {
  chapter?: string;
  article?: string;
  paragraph?: string;
  source?: string;
  [key: string]: unknown;
};

export type ChatSource = {
  chunkId: string;
  article?: string;
  paragraph?: string;
  content: string;
  similarity?: number;
};

export type ChatMetadata = {
  provider?: string;
  model?: string;
  latencyMs?: number;
  [key: string]: unknown;
};

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    sourcePath: text("source_path").notNull(),
    contentHash: text("content_hash").notNull(),
    status: documentStatusEnum("status").notNull().default("pending"),
    embeddingModel: text("embedding_model"),
    embeddingDimension: integer("embedding_dimension"),
    metadata: jsonb("metadata").$type<DocumentMetadata>(),
    errorMessage: text("error_message"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("documents_content_hash_idx").on(table.contentHash),
    index("documents_active_status_idx").on(table.isActive, table.status),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    chapter: text("chapter"),
    articleNumber: text("article_number"),
    paragraphNumber: text("paragraph_number"),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    embedding: vector("embedding", { dimensions: 768 }),
    metadata: jsonb("metadata").$type<ChunkMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("document_chunks_document_index_idx").on(
      table.documentId,
      table.chunkIndex,
    ),
    index("document_chunks_article_idx").on(
      table.articleNumber,
      table.paragraphNumber,
    ),
  ],
);

export const visitorSessions = pgTable(
  "visitor_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull(),
    questionCount: integer("question_count").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("visitor_sessions_session_id_idx").on(table.sessionId),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull(),
    role: chatRoleEnum("role").notNull(),
    message: text("message").notNull(),
    status: chatStatusEnum("status"),
    sources: jsonb("sources").$type<ChatSource[]>(),
    metadata: jsonb("metadata").$type<ChatMetadata>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_session_created_idx").on(
      table.sessionId,
      table.createdAt,
    ),
  ],
);

export const feedback = pgTable(
  "feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id"),
    name: text("name"),
    email: text("email"),
    message: text("message").notNull(),
    status: feedbackStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("feedback_status_created_idx").on(table.status, table.createdAt),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type VisitorSession = typeof visitorSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
