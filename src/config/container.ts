import { getEnv } from './env'
import { VercelAIAdapter } from '@/adapters/ai/vercel-ai.adapter'
import { OllamaAdapter } from '@/adapters/ai/ollama.adapter'
import { AgentRunnerAdapter } from '@/adapters/ai/agent-runner.adapter'
import { PgVectorAdapter } from '@/adapters/db/pgvector.adapter'
import { AgentStoreAdapter } from '@/adapters/db/agent-store.adapter'
import { AgentExecutionStoreAdapter } from '@/adapters/db/agent-execution-store.adapter'
import { GoogleDriveAdapter } from '@/adapters/providers/google-drive.adapter'
import { createDb } from '@/adapters/db/connection'
import { ChatUseCase } from '@/core/usecases/chat.usecase'
import { RagUseCase } from '@/core/usecases/rag.usecase'
import { AgentUseCase } from '@/core/usecases/agent.usecase'
import { ConversationUseCase } from '@/core/usecases/conversation.usecase'
import { ConversationStoreAdapter } from '@/adapters/db/conversation-store.adapter'
import { ScheduledAgentStoreAdapter } from '@/adapters/db/scheduled-agent-store.adapter'
import { ScheduledAgentUseCase } from '@/core/usecases/scheduled-agent.usecase'
import { AuditStoreAdapter } from '@/adapters/db/audit-store.adapter'
import { KnowledgeBaseStoreAdapter } from '@/adapters/db/knowledge-base-store.adapter'
import { KnowledgeBaseUseCase } from '@/core/usecases/knowledge-base.usecase'
import { ToolRegistry, createRagSearchTool, getCurrentTimeTool, webSearchTool, createDelegateAgentTool } from '@/core/tools'
import { ExportUseCase } from '@/core/usecases/export.usecase'
import { MarkdownExporter } from '@/adapters/export/markdown.adapter'
import { PdfExporter } from '@/adapters/export/pdf.adapter'
import { JsonExporter } from '@/adapters/export/json.adapter'
import { MarketplaceStoreAdapter } from '@/adapters/db/marketplace-store.adapter'
import { MarketplaceUseCase } from '@/core/usecases/marketplace.usecase'
import { WorkspaceStoreAdapter } from '@/adapters/db/workspace-store.adapter'
import { WorkspaceUseCase } from '@/core/usecases/workspace.usecase'
// T3.1: Observability
import { TraceStoreAdapter } from '@/adapters/db/trace-store.adapter'
import { DbTracerAdapter } from '@/adapters/tracing/db-tracer.adapter'
import { ObservabilityUseCase } from '@/core/usecases/observability.usecase'
// T3.2: Workflows
import { WorkflowStoreAdapter } from '@/adapters/db/workflow-store.adapter'
import { WorkflowRuntimeUseCase } from '@/core/usecases/workflow-runtime.usecase'
import { WorkflowUseCase } from '@/core/usecases/workflow.usecase'
// P0.3: MCP
import { McpServerStoreAdapter } from '@/adapters/db/mcp-server-store.adapter'
import type { AIProviderPort } from '@/core/ports/out/ai-provider.port'
import type { RagConfig } from '@/core/usecases/rag.usecase'
import type { ExporterPort, ExportFormat } from '@/core/ports/out/exporter.port'

function createAIProvider(): AIProviderPort {
  const env = getEnv()

  switch (env.AI_PROVIDER) {
    case 'ollama':
      return new OllamaAdapter()
    case 'anthropic':
      return new VercelAIAdapter('anthropic')
    case 'openai':
    default:
      return new VercelAIAdapter('openai')
  }
}

function getRagConfig(): RagConfig {
  const env = getEnv()

  switch (env.AI_PROVIDER) {
    case 'ollama':
      return { embeddingModel: 'nomic-embed-text', embeddingDimensions: 768, chatModel: 'llama3.1' }
    case 'anthropic':
      return { embeddingModel: 'text-embedding-3-small', embeddingDimensions: 768, chatModel: 'claude-sonnet-4-20250514' }
    case 'openai':
    default:
      return { embeddingModel: 'text-embedding-3-small', embeddingDimensions: 768, chatModel: 'gpt-4o' }
  }
}

function createToolRegistry(ragUseCase: RagUseCase): ToolRegistry {
  const registry = new ToolRegistry()
  registry.register(createRagSearchTool(ragUseCase))
  registry.register(getCurrentTimeTool)
  registry.register(webSearchTool)
  registry.register(createDelegateAgentTool(() => getContainer()))
  return registry
}

interface Container {
  aiProvider: AIProviderPort
  vectorStore: PgVectorAdapter
  chatUseCase: ChatUseCase
  ragUseCase: RagUseCase
  agentUseCase: AgentUseCase
  executionStore: AgentExecutionStoreAdapter
  toolRegistry: ToolRegistry
  fileSource: GoogleDriveAdapter
  conversationUseCase: ConversationUseCase
  scheduledAgentUseCase: ScheduledAgentUseCase
  auditStore: AuditStoreAdapter
  knowledgeBaseStore: KnowledgeBaseStoreAdapter
  knowledgeBaseUseCase: KnowledgeBaseUseCase
  exportUseCase: ExportUseCase
  marketplaceUseCase: MarketplaceUseCase
  workspaceStore: WorkspaceStoreAdapter
  workspaceUseCase: WorkspaceUseCase
  // T3.1: Observability
  observabilityUseCase: ObservabilityUseCase
  tracer: DbTracerAdapter
  // T3.2: Workflows
  workflowUseCase: WorkflowUseCase
  workflowRuntimeUseCase: WorkflowRuntimeUseCase
  workflowStore: WorkflowStoreAdapter
  // P0.3: MCP
  mcpServerStore: McpServerStoreAdapter
}

let _container: Container | null = null

function buildContainer(): Container {
  const db = createDb()
  const aiProvider = createAIProvider()
  const vectorStore = new PgVectorAdapter(db)

  // Stores
  const agentStore = new AgentStoreAdapter(db)
  const executionStore = new AgentExecutionStoreAdapter(db)
  const conversationStore = new ConversationStoreAdapter(db)
  const scheduledAgentStore = new ScheduledAgentStoreAdapter(db)
  const auditStore = new AuditStoreAdapter(db)
  const knowledgeBaseStore = new KnowledgeBaseStoreAdapter(db)
  const marketplaceStore = new MarketplaceStoreAdapter(db)
  const workspaceStore = new WorkspaceStoreAdapter(db)

  // T3.1: Observability stores + tracer
  const traceStore = new TraceStoreAdapter(db)
  const tracer = new DbTracerAdapter(traceStore)
  const workflowStore = new WorkflowStoreAdapter(db)
  // P0.3: MCP server config store
  const mcpServerStore = new McpServerStoreAdapter(db)

  // External file sources
  const fileSource = new GoogleDriveAdapter()

  // Use cases
  const chatUseCase = new ChatUseCase(aiProvider)
  const ragUseCase = new RagUseCase(aiProvider, vectorStore, getRagConfig())

  // Tools & Runner
  const toolRegistry = createToolRegistry(ragUseCase)

  // T3.1: AgentRunnerAdapter now receives tracer for span emission
  const agentRunner = new AgentRunnerAdapter(tracer)

  // Agent use case (fully wired — T3.1: tracer injected as 6th arg)
  const agentUseCase = new AgentUseCase(
    agentStore,
    executionStore,
    toolRegistry,
    agentRunner,
    () => getContainer(),
    tracer,
  )

  // T3.1: Observability use case
  const observabilityUseCase = new ObservabilityUseCase(traceStore)

  // T3.2: Workflow runtime — receives tracer + agentUseCase (full registry, delegation, RAG)
  const workflowRuntimeUseCase = new WorkflowRuntimeUseCase(tracer, workflowStore, agentUseCase, auditStore)

  // T3.2: Workflow use case
  const workflowUseCase = new WorkflowUseCase(workflowStore, agentStore, workflowRuntimeUseCase, auditStore)

  // Conversation use case
  const conversationUseCase = new ConversationUseCase(conversationStore)

  // Scheduled agent use case
  const scheduledAgentUseCase = new ScheduledAgentUseCase(scheduledAgentStore, agentUseCase)

  // Knowledge base use case
  const knowledgeBaseUseCase = new KnowledgeBaseUseCase(knowledgeBaseStore)

  // Export use case — register all supported exporters
  const exporters = new Map<ExportFormat, ExporterPort>([
    ['md', new MarkdownExporter()],
    ['pdf', new PdfExporter()],
    ['json', new JsonExporter()],
  ])
  const exportUseCase = new ExportUseCase(conversationUseCase, exporters)

  // Marketplace use case (depends on agentUseCase)
  const marketplaceUseCase = new MarketplaceUseCase(marketplaceStore, agentUseCase)

  // Workspace use case
  const workspaceUseCase = new WorkspaceUseCase(workspaceStore)

  return {
    aiProvider,
    vectorStore,
    chatUseCase,
    ragUseCase,
    agentUseCase,
    executionStore,
    toolRegistry,
    fileSource,
    conversationUseCase,
    scheduledAgentUseCase,
    auditStore,
    knowledgeBaseStore,
    knowledgeBaseUseCase,
    exportUseCase,
    marketplaceUseCase,
    workspaceStore,
    workspaceUseCase,
    // T3.1: Observability
    observabilityUseCase,
    tracer,
    // T3.2: Workflows
    workflowUseCase,
    workflowRuntimeUseCase,
    workflowStore,
    // P0.3: MCP
    mcpServerStore,
  }
}

export function getContainer() {
  if (!_container) {
    _container = buildContainer()
  }
  return _container
}
