import { streamText, tool, stepCountIs } from 'ai'
import type { LanguageModel, ToolSet } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { Agent, AgentProvider } from '@/core/domain/entities/agent'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import type { AgentStep, AgentToolCall } from '@/core/domain/entities/agent-execution'
import type { Message } from '@/core/domain/entities/message'

export interface AgentRunnerInput {
  agent: Agent
  messages: Message[]
  tools: AgentToolDefinition[]
  context?: Record<string, unknown>
}

export interface AgentStreamEvent {
  type: 'text-delta' | 'step-complete' | 'tool-call' | 'finish' | 'error'
  data: unknown
}

function getModel(modelId: string, provider: Agent['provider']): LanguageModel {
  switch (provider) {
    case 'anthropic':
      return anthropic(modelId)
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL
          ? `${process.env.OLLAMA_BASE_URL}/v1`
          : 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      return ollama(modelId)
    }
    case 'openai':
    default:
      return openai(modelId)
  }
}

const providerToolResolvers: Record<string, (provider: AgentProvider) => ToolSet[string] | null> = {
  'web-search': (provider) => {
    switch (provider) {
      case 'anthropic':
        return anthropic.tools.webSearch_20250305({ maxUses: 5 }) as ToolSet[string]
      case 'openai':
        return openai.tools.webSearch({ searchContextSize: 'medium' }) as ToolSet[string]
      default:
        return null
    }
  },
}

function convertTools(definitions: AgentToolDefinition[], provider: AgentProvider): ToolSet {
  const sdkTools: ToolSet = {}

  for (const def of definitions) {
    if (def.type === 'provider') {
      const resolver = providerToolResolvers[def.id]
      if (resolver) {
        const resolved = resolver(provider)
        if (resolved) sdkTools[def.id] = resolved
      }
      continue
    }

    if (!def.execute) continue

    sdkTools[def.id] = tool({
      description: def.description,
      inputSchema: def.parametersSchema as Parameters<typeof tool>[0]['inputSchema'],
      execute: async (input: unknown) => {
        return def.execute!(input)
      },
    }) as ToolSet[string]
  }

  return sdkTools
}

export class AgentRunnerAdapter {
  run(input: AgentRunnerInput): ReadableStream<string> {
    const { agent, messages, tools: toolDefs } = input
    const model = getModel(agent.model, agent.provider)
    const sdkTools = convertTools(toolDefs, agent.provider)
    const steps: AgentStep[] = []

    const sdkMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    return new ReadableStream<string>({
      async start(controller) {
        try {
          const result = streamText({
            model,
            messages: sdkMessages,
            system: agent.systemPrompt || undefined,
            tools: sdkTools,
            toolChoice: agent.config.toolChoice,
            temperature: agent.config.temperature,
            stopWhen: stepCountIs(agent.config.maxSteps),
            onStepFinish(event) {
              const toolCalls: AgentToolCall[] = event.toolCalls.map((tc) => ({
                toolName: tc.toolName,
                input: tc.input as Record<string, unknown>,
                output: event.toolResults.find((tr) => tr.toolCallId === tc.toolCallId)?.output,
              }))

              const step: AgentStep = {
                stepNumber: event.stepNumber,
                text: event.text,
                toolCalls,
                tokensUsed: (event.usage.inputTokens ?? 0) + (event.usage.outputTokens ?? 0),
                finishReason: event.finishReason,
              }
              steps.push(step)

              controller.enqueue(
                `event:step-complete\ndata:${JSON.stringify(step)}\n\n`,
              )
            },
          })

          for await (const chunk of result.textStream) {
            controller.enqueue(`event:text-delta\ndata:${JSON.stringify({ text: chunk })}\n\n`)
          }

          const totalTokens = steps.reduce((sum, s) => sum + s.tokensUsed, 0)
          const finalText = await result.text

          controller.enqueue(
            `event:finish\ndata:${JSON.stringify({
              text: finalText,
              steps,
              totalTokens,
            })}\n\n`,
          )

          controller.close()
        } catch (error) {
          controller.enqueue(
            `event:error\ndata:${JSON.stringify({
              message: error instanceof Error ? error.message : 'Unknown error',
            })}\n\n`,
          )
          controller.close()
        }
      },
    })
  }
}
