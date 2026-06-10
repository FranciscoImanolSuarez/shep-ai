CREATE TABLE "agent_installs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_agent_id" uuid NOT NULL,
	"installer_id" text NOT NULL,
	"installed_agent_id" uuid NOT NULL,
	"installed_version" integer NOT NULL,
	"latest_version" integer NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_agent_id" uuid NOT NULL,
	"rater_id" text NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_ratings_rating_check" CHECK ("agent_ratings"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "published_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"publisher_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"system_prompt_snapshot" text NOT NULL,
	"tool_ids_snapshot" jsonb DEFAULT '[]'::jsonb,
	"config_snapshot" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"install_count" integer DEFAULT 0 NOT NULL,
	"average_rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_installs" ADD CONSTRAINT "agent_installs_published_agent_id_published_agents_id_fk" FOREIGN KEY ("published_agent_id") REFERENCES "public"."published_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_installs" ADD CONSTRAINT "agent_installs_installed_agent_id_agents_id_fk" FOREIGN KEY ("installed_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_ratings" ADD CONSTRAINT "agent_ratings_published_agent_id_published_agents_id_fk" FOREIGN KEY ("published_agent_id") REFERENCES "public"."published_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "published_agents" ADD CONSTRAINT "published_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_installs_unique" ON "agent_installs" USING btree ("published_agent_id","installer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_agent_ratings_unique" ON "agent_ratings" USING btree ("published_agent_id","rater_id");--> statement-breakpoint
CREATE INDEX "idx_published_agents_publisher_id" ON "published_agents" USING btree ("publisher_id");--> statement-breakpoint
CREATE INDEX "idx_published_agents_category" ON "published_agents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_published_agents_is_public" ON "published_agents" USING btree ("is_public");