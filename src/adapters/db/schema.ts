import { pgTable, text, timestamp, integer, jsonb, uuid, vector, boolean, index, numeric, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// --- Workspaces ---

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: text('owner_id').notNull(),
  plan: text('plan').notNull().default('free'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_workspaces_owner_id').on(table.ownerId),
])

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_workspace_members_unique').on(table.workspaceId, table.userId),
  index('idx_workspace_members_user_id').on(table.userId),
])

export const workspaceInvitations = pgTable('workspace_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  inviterId: text('inviter_id').notNull(),
  inviteeEmail: text('invitee_email').notNull(),
  role: text('role').notNull().default('member'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_workspace_invitations_invitee_email').on(table.inviteeEmail),
  index('idx_workspace_invitations_token').on(table.token),
])

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  activeWorkspaceId: uuid('active_workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// --- Knowledge Bases ---

export const knowledgeBases = pgTable('knowledge_bases', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_knowledge_bases_user_id').on(table.userId),
])

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  source: text('source').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 768 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  chunkIndex: integer('chunk_index').notNull(),
}, (table) => [
  index('embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
])

// --- Agents ---

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id, { onDelete: 'set null' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  systemPrompt: text('system_prompt').notNull().default(''),
  model: text('model').notNull(),
  provider: text('provider').notNull().default('openai'),
  toolIds: jsonb('tool_ids').$type<string[]>().default([]),
  config: jsonb('config').$type<{
    maxSteps: number
    temperature: number
    toolChoice: 'auto' | 'required' | 'none'
    maxDelegationDepth?: number
    tokenBudget?: number
    memoryEnabled?: boolean
  }>().default({ maxSteps: 10, temperature: 0.7, toolChoice: 'auto', maxDelegationDepth: 3 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const agentExecutions = pgTable('agent_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('running'),
  input: jsonb('input').$type<unknown[]>().default([]),
  steps: jsonb('steps').$type<unknown[]>().default([]),
  result: text('result'),
  totalTokens: integer('total_tokens').notNull().default(0),
  parentExecutionId: uuid('parent_execution_id'),
  // Added for workflow + observability linking (nullable, fully backward-compatible)
  workflowRunId: uuid('workflow_run_id'), // FK to workflow_runs.id (set null on delete — FK added after workflow_runs table)
  traceId: text('trace_id'), // NOT a FK — traces may be cleaned up independently
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})

// --- Scheduled Agents ---

export const scheduledAgents = pgTable('scheduled_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  cronExpression: text('cron_expression').notNull(),
  input: jsonb('input').$type<Record<string, unknown>>().notNull().default({}),
  enabled: boolean('enabled').notNull().default(true),
  notifyOnSuccess: boolean('notify_on_success').notNull().default(false),
  notifyOnFailure: boolean('notify_on_failure').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_scheduled_agents_user_id').on(table.userId),
  index('idx_scheduled_agents_next_run_at').on(table.nextRunAt),
])

export const scheduledAgentRuns = pgTable('scheduled_agent_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduledAgentId: uuid('scheduled_agent_id').notNull().references(() => scheduledAgents.id, { onDelete: 'cascade' }),
  agentExecutionId: uuid('agent_execution_id').references(() => agentExecutions.id),
  status: text('status').notNull().default('running'),
  result: text('result'),
  errorMessage: text('error_message'),
  totalTokens: integer('total_tokens').notNull().default(0),
  durationMs: integer('duration_ms'),
  triggeredBy: text('triggered_by').notNull().default('cron'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_scheduled_agent_runs_schedule_created').on(table.scheduledAgentId, table.createdAt),
])

// --- Conversations ---

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  knowledgeBaseId: uuid('knowledge_base_id').references(() => knowledgeBases.id, { onDelete: 'set null' }),
  title: text('title').notNull().default(''),
  model: text('model').notNull().default('gpt-4o-mini'),
  useRag: boolean('use_rag').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_conversations_user_id').on(table.userId),
  index('idx_conversations_updated_at').on(table.updatedAt),
])

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role').$type<'user' | 'assistant' | 'system'>().notNull(),
  content: text('content').notNull(),
  parts: jsonb('parts').$type<unknown[]>().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_messages_conversation_id').on(table.conversationId),
  index('idx_messages_created_at').on(table.createdAt),
])

// --- Marketplace ---

export const publishedAgents = pgTable('published_agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  publisherId: text('publisher_id').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  category: text('category').notNull().default('general'),
  tags: jsonb('tags').$type<string[]>().default([]),
  systemPromptSnapshot: text('system_prompt_snapshot').notNull(),
  toolIdsSnapshot: jsonb('tool_ids_snapshot').$type<string[]>().default([]),
  configSnapshot: jsonb('config_snapshot').$type<{
    model: string
    provider: string
    maxSteps: number
    temperature: number
    toolChoice: string
  }>().notNull(),
  version: integer('version').notNull().default(1),
  installCount: integer('install_count').notNull().default(0),
  averageRating: numeric('average_rating', { precision: 3, scale: 2 }).notNull().default('0'),
  isPublic: boolean('is_public').notNull().default(true),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_published_agents_publisher_id').on(table.publisherId),
  index('idx_published_agents_category').on(table.category),
  index('idx_published_agents_is_public').on(table.isPublic),
])

export const agentInstalls = pgTable('agent_installs', {
  id: uuid('id').primaryKey().defaultRandom(),
  publishedAgentId: uuid('published_agent_id').notNull().references(() => publishedAgents.id, { onDelete: 'cascade' }),
  installerId: text('installer_id').notNull(),
  installedAgentId: uuid('installed_agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  installedVersion: integer('installed_version').notNull(),
  latestVersion: integer('latest_version').notNull(),
  installedAt: timestamp('installed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_agent_installs_unique').on(table.publishedAgentId, table.installerId),
])

export const agentRatings = pgTable('agent_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  publishedAgentId: uuid('published_agent_id').notNull().references(() => publishedAgents.id, { onDelete: 'cascade' }),
  raterId: text('rater_id').notNull(),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_agent_ratings_unique').on(table.publishedAgentId, table.raterId),
  check('agent_ratings_rating_check', sql`${table.rating} BETWEEN 1 AND 5`),
])

// --- Audit Events ---

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  tokenCount: integer('token_count').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_audit_events_user_created').on(table.userId, table.createdAt),
  index('idx_audit_events_type_created').on(table.eventType, table.createdAt),
])

// --- Observability ---

export const traces = pgTable('traces', {
  id: text('id').primaryKey(), // 32-char hex, OTel-compatible
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  rootSpanId: text('root_span_id').notNull(),
  rootKind: text('root_kind').$type<'agent' | 'workflow'>().notNull(),
  status: text('status').$type<'running' | 'ok' | 'error'>().notNull().default('running'),
  // Denormalized rollups (written on finishTrace)
  durationMs: integer('duration_ms'),
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }).notNull().default('0'),
  spanCount: integer('span_count').notNull().default(0),
  // Cross-links
  agentExecutionId: uuid('agent_execution_id').references(() => agentExecutions.id, { onDelete: 'set null' }),
  workflowRunId: uuid('workflow_run_id'), // FK to workflow_runs added after that table is created
  // Metadata
  attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
}, (table) => [
  index('idx_traces_workspace_started').on(table.workspaceId, table.startedAt.desc()),
  index('idx_traces_status').on(table.status),
  index('idx_traces_agent_execution').on(table.agentExecutionId),
  index('idx_traces_workflow_run').on(table.workflowRunId),
])

export const spans = pgTable('spans', {
  id: text('id').primaryKey(), // 16-char hex, OTel-compatible
  traceId: text('trace_id').notNull().references(() => traces.id, { onDelete: 'cascade' }),
  parentSpanId: text('parent_span_id'), // null on root
  name: text('name').notNull(),
  kind: text('kind').$type<'agent' | 'llm' | 'tool' | 'workflow' | 'workflow_node'>().notNull(),
  status: text('status').$type<'ok' | 'error'>().notNull().default('ok'),
  statusMessage: text('status_message'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),
  durationMs: integer('duration_ms').notNull(),
  // gen_ai.* / llm.* attributes promoted to columns for filtering
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  costUsd: numeric('cost_usd', { precision: 12, scale: 6 }),
  // Free-form OTel-keyed attributes (gen_ai.system, gen_ai.request.model, tool.name, etc.)
  attributes: jsonb('attributes').$type<Record<string, unknown>>().notNull().default({}),
  events: jsonb('events').$type<Array<{ name: string; ts: string; attrs?: Record<string, unknown> }>>().notNull().default([]),
}, (table) => [
  index('idx_spans_trace_id').on(table.traceId),
  index('idx_spans_parent_span_id').on(table.parentSpanId),
  index('idx_spans_kind').on(table.kind),
  index('idx_spans_trace_started').on(table.traceId, table.startedAt),
])

// --- Workflows ---

export const workflows = pgTable('workflows', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  definition: jsonb('definition').$type<{
    nodes: Array<{ id: string; type: 'input' | 'output' | 'agent' | 'condition'; position: { x: number; y: number }; config: Record<string, unknown> }>
    edges: Array<{ id: string; source: string; sourceHandle?: string; target: string; targetHandle?: string }>
  }>().notNull(),
  version: integer('version').notNull().default(1),
  enabled: boolean('enabled').notNull().default(true),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_workflows_workspace_id').on(table.workspaceId),
])

export const workflowRuns = pgTable('workflow_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  triggeredBy: text('triggered_by').$type<'manual' | 'api'>().notNull().default('manual'),
  triggeredByUserId: text('triggered_by_user_id'),
  status: text('status').$type<'running' | 'completed' | 'failed'>().notNull().default('running'),
  // ADR-4: snapshot the definition at run start
  definitionSnapshot: jsonb('definition_snapshot').$type<{
    nodes: Array<{ id: string; type: 'input' | 'output' | 'agent' | 'condition'; position: { x: number; y: number }; config: Record<string, unknown> }>
    edges: Array<{ id: string; source: string; sourceHandle?: string; target: string; targetHandle?: string }>
  }>().notNull(),
  input: jsonb('input').$type<Record<string, unknown>>().notNull().default({}),
  output: jsonb('output').$type<Record<string, unknown>>(),
  errorMessage: text('error_message'),
  errorNodeId: text('error_node_id'),
  // Link to the trace produced by this run
  traceId: text('trace_id').references(() => traces.id, { onDelete: 'set null' }),
  // Rollups
  totalTokens: integer('total_tokens').notNull().default(0),
  totalCostUsd: numeric('total_cost_usd', { precision: 12, scale: 6 }).notNull().default('0'),
  durationMs: integer('duration_ms'),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_workflow_runs_workflow_started').on(table.workflowId, table.startedAt.desc()),
  index('idx_workflow_runs_workspace_status').on(table.workspaceId, table.status, table.startedAt.desc()),
])

export const workflowRunNodes = pgTable('workflow_run_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowRunId: uuid('workflow_run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  nodeId: text('node_id').notNull(), // matches definition.nodes[].id
  nodeType: text('node_type').$type<'input' | 'output' | 'agent' | 'condition'>().notNull(),
  status: text('status').$type<'pending' | 'running' | 'completed' | 'skipped' | 'failed'>().notNull().default('pending'),
  input: jsonb('input').$type<unknown>(),
  output: jsonb('output').$type<unknown>(),
  errorMessage: text('error_message'),
  spanId: text('span_id'), // pointer into spans table for drill-in
  agentExecutionId: uuid('agent_execution_id').references(() => agentExecutions.id, { onDelete: 'set null' }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_workflow_run_nodes_run_id').on(table.workflowRunId),
  uniqueIndex('idx_workflow_run_nodes_run_node').on(table.workflowRunId, table.nodeId),
])

// --- MCP Servers (P0.3) ---
// Workspace-scoped Model Context Protocol server configurations. Agents opt in
// by including `mcp:<server-id>` in their toolIds, which pulls in ALL tools the
// server exposes at run time.

export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Only HTTP-based transports are supported in serverless deployment (no stdio)
  transportType: text('transport_type').$type<'http' | 'sse'>().notNull().default('http'),
  url: text('url').notNull(),
  // Stored plaintext for now; future work: envelope encryption via a KMS-backed key
  authToken: text('auth_token'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_mcp_servers_workspace_id').on(table.workspaceId),
])
