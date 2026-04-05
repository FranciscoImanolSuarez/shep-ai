CREATE TABLE "agent_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"input" jsonb DEFAULT '[]'::jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"result" text,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"parent_execution_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"model" text NOT NULL,
	"provider" text DEFAULT 'openai' NOT NULL,
	"tool_ids" jsonb DEFAULT '[]'::jsonb,
	"config" jsonb DEFAULT '{"maxSteps":10,"temperature":0.7,"toolChoice":"auto"}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"chunk_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"source" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_executions" ADD CONSTRAINT "agent_executions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "embedding_idx" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);