CREATE TABLE "spans" (
	"id" text PRIMARY KEY NOT NULL,
	"trace_id" text NOT NULL,
	"parent_span_id" text,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'ok' NOT NULL,
	"status_message" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(12, 6),
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"root_span_id" text NOT NULL,
	"root_kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"duration_ms" integer,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"span_count" integer DEFAULT 0 NOT NULL,
	"agent_execution_id" uuid,
	"workflow_run_id" uuid,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_run_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"node_id" text NOT NULL,
	"node_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error_message" text,
	"span_id" text,
	"agent_execution_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflow_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"triggered_by" text DEFAULT 'manual' NOT NULL,
	"triggered_by_user_id" text,
	"status" text DEFAULT 'running' NOT NULL,
	"definition_snapshot" jsonb NOT NULL,
	"input" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output" jsonb,
	"error_message" text,
	"error_node_id" text,
	"trace_id" text,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"total_cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"duration_ms" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"definition" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_executions" ADD COLUMN "workflow_run_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_executions" ADD COLUMN "trace_id" text;--> statement-breakpoint
ALTER TABLE "spans" ADD CONSTRAINT "spans_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traces" ADD CONSTRAINT "traces_agent_execution_id_agent_executions_id_fk" FOREIGN KEY ("agent_execution_id") REFERENCES "public"."agent_executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_nodes" ADD CONSTRAINT "workflow_run_nodes_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_run_nodes" ADD CONSTRAINT "workflow_run_nodes_agent_execution_id_agent_executions_id_fk" FOREIGN KEY ("agent_execution_id") REFERENCES "public"."agent_executions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_spans_trace_id" ON "spans" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_spans_parent_span_id" ON "spans" USING btree ("parent_span_id");--> statement-breakpoint
CREATE INDEX "idx_spans_kind" ON "spans" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_spans_trace_started" ON "spans" USING btree ("trace_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_traces_workspace_started" ON "traces" USING btree ("workspace_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_traces_status" ON "traces" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_traces_agent_execution" ON "traces" USING btree ("agent_execution_id");--> statement-breakpoint
CREATE INDEX "idx_traces_workflow_run" ON "traces" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_run_nodes_run_id" ON "workflow_run_nodes" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_workflow_run_nodes_run_node" ON "workflow_run_nodes" USING btree ("workflow_run_id","node_id");--> statement-breakpoint
CREATE INDEX "idx_workflow_runs_workflow_started" ON "workflow_runs" USING btree ("workflow_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_workflow_runs_workspace_status" ON "workflow_runs" USING btree ("workspace_id","status","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_workflows_workspace_id" ON "workflows" USING btree ("workspace_id");