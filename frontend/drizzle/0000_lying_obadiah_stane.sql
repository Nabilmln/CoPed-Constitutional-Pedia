CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."chat_status" AS ENUM('answered', 'rejected', 'no_context', 'error');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."feedback_status" AS ENUM('new', 'reviewed', 'archived');--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"message" text NOT NULL,
	"status" "chat_status",
	"sources" jsonb,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chapter" text,
	"article_number" text,
	"paragraph_number" text,
	"content" text NOT NULL,
	"token_count" integer,
	"embedding" vector(768) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"source_path" text NOT NULL,
	"content_hash" text NOT NULL,
	"status" "document_status" DEFAULT 'pending' NOT NULL,
	"embedding_model" text,
	"embedding_dimension" integer,
	"metadata" jsonb,
	"error_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid,
	"name" text,
	"email" text,
	"message" text NOT NULL,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_count" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_session_created_idx" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "document_chunks_document_index_idx" ON "document_chunks" USING btree ("document_id","chunk_index");--> statement-breakpoint
CREATE INDEX "document_chunks_article_idx" ON "document_chunks" USING btree ("article_number","paragraph_number");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_content_hash_idx" ON "documents" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "documents_active_status_idx" ON "documents" USING btree ("is_active","status");--> statement-breakpoint
CREATE INDEX "feedback_status_created_idx" ON "feedback" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "visitor_sessions_session_id_idx" ON "visitor_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION match_document_chunks(
	query_embedding vector(768),
	match_count integer DEFAULT 5,
	similarity_threshold double precision DEFAULT 0.3
)
RETURNS TABLE (
	id uuid,
	document_id uuid,
	chunk_index integer,
	chapter text,
	article_number text,
	paragraph_number text,
	content text,
	metadata jsonb,
	similarity double precision
)
LANGUAGE sql
STABLE
AS $$
	SELECT
		chunks.id,
		chunks.document_id,
		chunks.chunk_index,
		chunks.chapter,
		chunks.article_number,
		chunks.paragraph_number,
		chunks.content,
		chunks.metadata,
		1 - (chunks.embedding <=> query_embedding) AS similarity
	FROM document_chunks AS chunks
	INNER JOIN documents AS document
		ON document.id = chunks.document_id
	WHERE
		document.is_active = true
		AND document.status = 'ready'
		AND 1 - (chunks.embedding <=> query_embedding) >= similarity_threshold
	ORDER BY chunks.embedding <=> query_embedding
	LIMIT LEAST(GREATEST(match_count, 1), 20);
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS TABLE (
	total_visitors bigint,
	total_questions bigint,
	total_feedback bigint
)
LANGUAGE sql
STABLE
AS $$
	SELECT
		(SELECT count(*) FROM visitor_sessions) AS total_visitors,
		(
			SELECT count(*)
			FROM chat_messages
			WHERE role = 'user'
		) AS total_questions,
		(SELECT count(*) FROM feedback) AS total_feedback;
$$;
