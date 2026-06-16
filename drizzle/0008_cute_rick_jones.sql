ALTER TABLE "agents" ALTER COLUMN "config" SET DEFAULT '{"maxSteps":10,"temperature":0.7,"toolChoice":"auto","maxDelegationDepth":3}'::jsonb;--> statement-breakpoint
CREATE INDEX "idx_agent_executions_agent_id" ON "agent_executions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agent_executions_parent_execution_id" ON "agent_executions" USING btree ("parent_execution_id");--> statement-breakpoint
CREATE INDEX "idx_agent_executions_trace_id" ON "agent_executions" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "idx_agent_executions_agent_created" ON "agent_executions" USING btree ("agent_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_agent_installs_published_agent_id" ON "agent_installs" USING btree ("published_agent_id");--> statement-breakpoint
CREATE INDEX "idx_agents_workspace_id" ON "agents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_documents_knowledge_base_id" ON "documents" USING btree ("knowledge_base_id");--> statement-breakpoint
CREATE INDEX "idx_documents_workspace_id" ON "documents" USING btree ("workspace_id");