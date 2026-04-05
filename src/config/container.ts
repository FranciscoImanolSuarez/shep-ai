import { getEnv } from './env'
import { VercelAIAdapter } from '@/adapters/ai/vercel-ai.adapter'
import { OllamaAdapter } from '@/adapters/ai/ollama.adapter'
import { AgentRunnerAdapter } from '@/adapters/ai/agent-runner.adapter'
import { PgVectorAdapter } from '@/adapters/db/pgvector.adapter'
import { AgentStoreAdapter } from '@/adapters/db/agent-store.adapter'
import { AgentExecutionStoreAdapter } from '@/adapters/db/agent-execution-store.adapter'
import { createDb } from '@/adapters/db/connection'
import { ChatUseCase } from '@/core/usecases/chat.usecase'
import { RagUseCase } from '@/core/usecases/rag.usecase'
import { AgentUseCase } from '@/core/usecases/agent.usecase'
import { ToolRegistry, createRagSearchTool, getCurrentTimeTool, webSearchTool } from '@/core/tools'
import type { AIProviderPort } from '@/core/ports/out/ai-provider.port'
import type { RagConfig } from '@/core/usecases/rag.usecase'

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
  return registry
}

let _container: ReturnType<typeof buildContainer> | null = null

function buildContainer() {
  const db = createDb()
  const aiProvider = createAIProvider()
  const vectorStore = new PgVectorAdapter(db)

  // Stores
  const agentStore = new AgentStoreAdapter(db)
  const executionStore = new AgentExecutionStoreAdapter(db)

  // Use cases
  const chatUseCase = new ChatUseCase(aiProvider)
  const ragUseCase = new RagUseCase(aiProvider, vectorStore, getRagConfig())

  // Tools & Runner
  const toolRegistry = createToolRegistry(ragUseCase)
  const agentRunner = new AgentRunnerAdapter()

  // Agent use case (fully wired)
  const agentUseCase = new AgentUseCase(
    agentStore,
    executionStore,
    toolRegistry,
    agentRunner,
  )

  return {
    aiProvider,
    vectorStore,
    chatUseCase,
    ragUseCase,
    agentUseCase,
    toolRegistry,
  }
}

export function getContainer() {
  if (!_container) {
    _container = buildContainer()
  }
  return _container
}
