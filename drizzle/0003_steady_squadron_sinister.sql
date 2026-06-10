CREATE TABLE "knowledge_bases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "knowledge_base_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "knowledge_base_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "knowledge_base_id" uuid;--> statement-breakpoint
CREATE INDEX "idx_knowledge_bases_user_id" ON "knowledge_bases" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_knowledge_base_id_knowledge_bases_id_fk" FOREIGN KEY ("knowledge_base_id") REFERENCES "public"."knowledge_bases"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Data migration: documents table has no user_id (documents are not user-scoped in schema).
-- Create a single system-owned "Default" KB and assign all orphaned documents to it.
-- The system sentinel user 'system' owns this KB; real users may create their own KBs going forward.
DO $$
DECLARE
  default_kb_id uuid;
BEGIN
  -- Only create the default KB if there are orphaned documents
  IF EXISTS (SELECT 1 FROM documents WHERE knowledge_base_id IS NULL) THEN
    INSERT INTO knowledge_bases (id, user_id, name, description)
    VALUES (gen_random_uuid(), 'system', 'Default', 'Default knowledge base for pre-existing documents')
    RETURNING id INTO default_kb_id;

    UPDATE documents
    SET knowledge_base_id = default_kb_id
    WHERE knowledge_base_id IS NULL;
  END IF;
END $$;
--> statement-breakpoint
-- Enforce NOT NULL after backfill
ALTER TABLE documents ALTER COLUMN knowledge_base_id SET NOT NULL;