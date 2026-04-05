import { pgTable, text, timestamp, integer, jsonb, uuid, vector, index } from 'drizzle-orm/pg-core'

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
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
  }>().default({ maxSteps: 10, temperature: 0.7, toolChoice: 'auto' }),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
})
