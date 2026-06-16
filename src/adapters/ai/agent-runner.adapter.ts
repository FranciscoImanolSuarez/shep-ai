import { streamText, generateText, tool, stepCountIs, Output, wrapLanguageModel } from 'ai'
import type { LanguageModel, ToolSet, ModelMessage, StopCondition, PrepareStepFunction, LanguageModelMiddleware } from 'ai'
import type { z } from 'zod'

// P2.4: load the devtools middleware once at module init when in dev mode.
// Resolved eagerly so Next.js bundler sees the static import shape; gated by
// NODE_ENV so production builds do not include it in the cold path.
let _devMiddleware: LanguageModelMiddleware | undefined
if (process.env.NODE_ENV === 'development') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@ai-sdk/devtools') as typeof import('@ai-sdk/devtools')
    _devMiddleware = mod.devToolsMiddleware()
  } catch (err) {
    console.warn('[agent-runner] devToolsMiddleware unavailable, continuing without it', err)
  }
}

// P2.1: Braintrust eval/observability — env-gated. Logs every LLM call to the
// configured Braintrust project so traces show up in their dashboard with token
// counts, latency, and full prompt/response. Identity function when no API key
// is set so production with no Braintrust is a hard no-op.
let _btWrap: <T extends object>(model: T) => T = (m) => m
if (process.env.BRAINTRUST_API_KEY) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bt = require('braintrust') as typeof import('braintrust')
    bt.initLogger({ projectName: process.env.BRAINTRUST_PROJECT ?? 'shep-ai' })
    _btWrap = bt.wrapAISDKModel
  } catch (err) {
    console.warn('[agent-runner] Braintrust unavailable, continuing without it', err)
  }
}
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { Agent, AgentProvider } from '@/core/domain/entities/agent'
import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'
import type { AgentStep, AgentToolCall } from '@/core/domain/entities/agent-execution'
import type { Message } from '@/core/domain/entities/message'
import type { TracerPort, TraceContext } from '@/core/ports/out/tracer.port'
import type { AgentRunnerPort } from '@/core/ports/out/agent-runner.port'
import { computeCost } from '@/core/domain/entities/audit-event'

/**
 * P0.1 — Anthropic prompt caching.
 * Marks the LAST message with `cache_control: ephemeral`. Anthropic caches EVERYTHING
 * preceding the marked block, so this caches system prompt + tools + all prior turns.
 * 90% discount on cache reads. No-op for non-Anthropic providers.
 */
export function addCacheControl(messages: ModelMessage[], provider: AgentProvider): ModelMessage[] {
  if (provider !== 'anthropic') return messages
  if (messages.length === 0) return messages
  return messages.map((msg, i) =>
    i === messages.length - 1
      ? { ...msg, providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' as const } } } }
      : msg,
  )
}

/**
 * P1.4 — Token-budget stop condition. Returns a StopCondition that halts the
 * tool loop once cumulative (input + output) tokens across completed steps
 * cross `maxTokens`. Pair with `stepCountIs(N)` as a hard step cap.
 */
export function tokenBudgetCondition(maxTokens: number): StopCondition<ToolSet> {
  return ({ steps }) => {
    let used = 0
    for (const s of steps) {
      used += (s.usage?.inputTokens ?? 0) + (s.usage?.outputTokens ?? 0)
      if (used >= maxTokens) return true
    }
    return false
  }
}

/** Extract Anthropic cache token usage from provider metadata (safely). */
function getCacheTokens(usage: unknown): { cacheReadTokens: number; cacheCreationTokens: number } {
  const u = usage as { providerMetadata?: { anthropic?: { cacheReadInputTokens?: number; cacheCreationInputTokens?: number } } } | undefined
  const meta = u?.providerMetadata?.anthropic
  return {
    cacheReadTokens: meta?.cacheReadInputTokens ?? 0,
    cacheCreationTokens: meta?.cacheCreationInputTokens ?? 0,
  }
}

export interface AgentRunnerInput {
  agent: Agent
  messages: Message[]
  tools: AgentToolDefinition[]
  context?: Record<string, unknown>
  /**
   * P0.2 — Optional Zod schema. When set, the model is forced to produce a JSON
   * object matching the schema and `AgentRunResult.object` is populated.
   * Honored by `runToCompletion` only; ignored by `run` (streaming).
   */
  outputSchema?: z.ZodType<unknown>
  /**
   * P1.3 — Optional `prepareStep` hook for the caller. Runs BEFORE the built-in
   * cache_control marker, so a caller can trim context / swap models / gate
   * tools per step without losing prompt caching. Anything returned overrides
   * the corresponding setting for that step.
   */
  prepareStepExtension?: PrepareStepFunction<ToolSet>
}

export interface AgentRunResult {
  text: string
  /** P0.2 — populated when `AgentRunnerInput.outputSchema` was provided. */
  object?: unknown
  steps: Array<{
    stepNumber: number
    text: string
    toolCalls: AgentToolCall[]
    tokensUsed: number
    finishReason: string
  }>
  totalTokens: number
  inputTokens: number
  outputTokens: number
}

export interface AgentStreamEvent {
  type: 'text-delta' | 'step-complete' | 'tool-call' | 'finish' | 'error'
  data: unknown
}

/** Optional runtime tracing context passed alongside AgentRunnerInput */
export interface AgentRuntimeContext {
  traceId: string
  parentSpanId: string
  workspaceId: string
}

function getModel(modelId: string, provider: Agent['provider']): LanguageModel {
  let model: LanguageModel
  switch (provider) {
    case 'anthropic':
      model = anthropic(modelId)
      break
    case 'ollama': {
      const ollama = createOpenAI({
        baseURL: process.env.OLLAMA_BASE_URL
          ? `${process.env.OLLAMA_BASE_URL}/v1`
          : 'http://localhost:11434/v1',
        apiKey: 'ollama',
      })
      model = ollama(modelId)
      break
    }
    case 'openai':
    default:
      model = openai(modelId)
  }

  // P2.1: wrap with Braintrust first so dev-tools sees the wrapped model and
  // shows Braintrust spans inline. No-op when BRAINTRUST_API_KEY is unset.
  const observed = _btWrap(model)
  // P2.4: wrap with devtools middleware in dev so calls show up at
  // http://localhost:4983. Production runs hit the raw (or Braintrust-wrapped) model.
  return _devMiddleware
    ? wrapLanguageModel({ model: observed, middleware: _devMiddleware })
    : observed
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

export function convertTools(definitions: AgentToolDefinition[], provider: AgentProvider): ToolSet {
  const sdkTools: ToolSet = {}

  for (const def of definitions) {
    // P0.3: MCP and any pre-built SDK tool is passed through directly. The MCP
    // client returns AI SDK Tool entries whose execute receives extra options
    // we must not strip.
    if (def.sdkTool) {
      sdkTools[def.id] = def.sdkTool as ToolSet[string]
      continue
    }

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
      // P2.3: pass execute through WITHOUT an async wrapper. If def.execute is
      // a generator (returns AsyncIterable), the SDK consumes it and streams
      // every yielded value as a tool-result delta. Wrapping with `async () =>`
      // would coerce it into `Promise<AsyncIterable>` and break streaming.
      execute: (input: unknown) => def.execute!(input),
      // P1.1: HITL — pass through `needsApproval`. The SDK pauses BEFORE execute
      // and surfaces an `approval-requested` stream part the chat UI handles.
      ...(def.needsApproval !== undefined
        ? {
            needsApproval:
              typeof def.needsApproval === 'function'
                ? async (input: unknown) =>
                    (def.needsApproval as (i: unknown) => boolean | Promise<boolean>)(input)
                : def.needsApproval,
          }
        : {}),
    }) as ToolSet[string]
  }

  return sdkTools
}

/**
 * Emit spans for one LLM step: one `llm` span + N `tool` child spans.
 * T1.8 + T1.9 + T1.11 all handled here.
 */
function emitStepSpans(
  tracer: TracerPort,
  ctx: TraceContext,
  runtimeContext: AgentRuntimeContext,
  agent: Agent,
  event: {
    stepNumber: number
    text: string
    finishReason: string
    usage: { inputTokens?: number; outputTokens?: number }
    toolCalls: Array<{ toolName: string; toolCallId: string; input: unknown }>
    toolResults: Array<{ toolCallId: string; output: unknown; isError?: boolean }>
    cacheReadTokens?: number
    cacheCreationTokens?: number
  },
): void {
  const inputTokens = event.usage.inputTokens ?? 0
  const outputTokens = event.usage.outputTokens ?? 0
  const totalTokens = inputTokens + outputTokens
  const rawCost = computeCost(agent.model, totalTokens)
  const costUsd = rawCost !== undefined ? rawCost.toFixed(6) : '0'

  const cacheReadTokens = event.cacheReadTokens ?? 0
  const cacheCreationTokens = event.cacheCreationTokens ?? 0

  // Start + end the llm span (T1.8)
  // P0.1: include cache tokens in attributes for cost visibility
  const { spanId: llmSpanId } = tracer.startSpan(ctx, {
    name: `llm.${agent.model}`,
    kind: 'llm',
    parentSpanId: runtimeContext.parentSpanId,
    attributes: {
      'gen_ai.system': agent.provider,
      'gen_ai.request.model': agent.model,
      'gen_ai.response.finish_reasons': [event.finishReason],
      'gen_ai.usage.input_tokens': inputTokens,
      'gen_ai.usage.output_tokens': outputTokens,
      ...(cacheReadTokens > 0 && { 'gen_ai.usage.cache_read_input_tokens': cacheReadTokens }),
      ...(cacheCreationTokens > 0 && { 'gen_ai.usage.cache_creation_input_tokens': cacheCreationTokens }),
    },
  })

  tracer.endSpan(ctx, {
    spanId: llmSpanId,
    status: 'ok',
    inputTokens,
    outputTokens,
    costUsd,
    attributes: {
      'llm.cost.usd': costUsd,
    },
  })

  // Emit tool spans as children of llm span (T1.9 + T1.11)
  for (const tc of event.toolCalls) {
    const toolResult = event.toolResults.find((tr) => tr.toolCallId === tc.toolCallId)
    const hasError = toolResult?.isError === true

    const { spanId: toolSpanId } = tracer.startSpan(ctx, {
      name: `tool.${tc.toolName}`,
      kind: 'tool',
      parentSpanId: llmSpanId,
      attributes: {
        'tool.name': tc.toolName,
        'tool.input': JSON.stringify(tc.input),
      },
    })

    tracer.endSpan(ctx, {
      spanId: toolSpanId,
      status: hasError ? 'error' : 'ok',
      statusMessage: hasError && toolResult?.output ? String(toolResult.output) : undefined,
      attributes: {
        'tool.output': JSON.stringify(toolResult?.output),
      },
    })

    // T1.11: add exception event on tool failure
    if (hasError && toolResult?.output) {
      tracer.addEvent(ctx, toolSpanId, {
        name: 'exception',
        ts: new Date().toISOString(),
        attrs: { 'exception.message': String(toolResult.output) },
      })
    }
  }
}

export class AgentRunnerAdapter implements AgentRunnerPort {
  constructor(
    // T1.8: optional tracer — existing instances without it still work
    private readonly tracer?: TracerPort,
  ) {}

  async runToCompletion(
    input: AgentRunnerInput,
    runtimeContext?: AgentRuntimeContext,
  ): Promise<AgentRunResult> {
    const { agent, messages, tools: toolDefs, outputSchema, prepareStepExtension } = input
    const model = getModel(agent.model, agent.provider)
    const sdkTools = convertTools(toolDefs, agent.provider)

    // P1.3 + P0.1: compose caller extension (runs first, can trim / swap / gate)
    // with the built-in cache_control marker (runs last on the resulting messages).
    const composedPrepareStep: PrepareStepFunction<ToolSet> = async (opts) => {
      const fromExtension = prepareStepExtension ? await prepareStepExtension(opts) : undefined
      const effectiveMessages = fromExtension?.messages ?? opts.messages
      return {
        ...(fromExtension ?? {}),
        messages: addCacheControl(effectiveMessages, agent.provider),
      }
    }

    const sdkMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    const tracer = this.tracer
    const ctx: TraceContext | undefined =
      tracer && runtimeContext
        ? { traceId: runtimeContext.traceId, workspaceId: runtimeContext.workspaceId }
        : undefined

    // P1.4: combine step cap with optional token budget. An array of stop
    // conditions short-circuits when ANY of them returns true.
    const stopWhen: StopCondition<ToolSet>[] = [stepCountIs(agent.config.maxSteps)]
    if (agent.config.tokenBudget && agent.config.tokenBudget > 0) {
      stopWhen.push(tokenBudgetCondition(agent.config.tokenBudget))
    }

    const result = await generateText({
      model,
      messages: sdkMessages,
      system: agent.systemPrompt || undefined,
      tools: sdkTools,
      toolChoice: agent.config.toolChoice,
      temperature: agent.config.temperature,
      stopWhen,
      // P1.3: composed prepareStep — caller extension first, then cache_control
      prepareStep: composedPrepareStep,
      // P0.2: structured output — when set, the SDK forces a JSON response
      // matching the schema and exposes it as `result.output`.
      ...(outputSchema ? { output: Output.object({ schema: outputSchema }) } : {}),
      onStepFinish(event) {
        if (tracer && ctx && runtimeContext) {
          const { cacheReadTokens, cacheCreationTokens } = getCacheTokens(event.usage)
          emitStepSpans(tracer, ctx, runtimeContext, agent, {
            stepNumber: event.stepNumber,
            text: event.text,
            finishReason: event.finishReason,
            usage: event.usage ?? {},
            cacheReadTokens,
            cacheCreationTokens,
            toolCalls: (event.toolCalls ?? []).map((tc) => ({
              toolName: tc.toolName,
              toolCallId: tc.toolCallId,
              input: tc.input,
            })),
            toolResults: (event.toolResults ?? []).map((tr) => ({
              toolCallId: tr.toolCallId,
              output: tr.output,
              isError: 'isError' in tr ? Boolean(tr.isError) : false,
            })),
          })
        }
      },
    })

    const steps: AgentRunResult['steps'] = result.steps.map((step, index) => {
      const toolCalls: AgentToolCall[] = step.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        input: tc.input as Record<string, unknown>,
        output: step.toolResults?.find((tr) => tr.toolCallId === tc.toolCallId)?.output,
      }))

      return {
        stepNumber: index,
        text: step.text,
        toolCalls,
        tokensUsed: (step.usage?.inputTokens ?? 0) + (step.usage?.outputTokens ?? 0),
        finishReason: step.finishReason,
      }
    })

    const totalTokens = steps.reduce((sum, s) => sum + s.tokensUsed, 0)
    const inputTokens = result.steps.reduce((sum, s) => sum + (s.usage?.inputTokens ?? 0), 0)
    const outputTokens = result.steps.reduce((sum, s) => sum + (s.usage?.outputTokens ?? 0), 0)

    // P0.2: surface the parsed object when an outputSchema was provided.
    // `result.output` is typed via the OUTPUT generic, but here OUTPUT is
    // inferred from the conditional spread — read it through an unknown cast.
    const object = outputSchema
      ? (result as unknown as { output?: unknown }).output
      : undefined

    return { text: result.text, object, steps, totalTokens, inputTokens, outputTokens }
  }

  run(input: AgentRunnerInput, runtimeContext?: AgentRuntimeContext): ReadableStream<string> {
    const { agent, messages, tools: toolDefs, prepareStepExtension } = input
    const model = getModel(agent.model, agent.provider)
    const sdkTools = convertTools(toolDefs, agent.provider)
    const steps: AgentStep[] = []

    // P1.3 + P0.1: composed prepareStep (caller extension first, cache last)
    const composedPrepareStep: PrepareStepFunction<ToolSet> = async (opts) => {
      const fromExtension = prepareStepExtension ? await prepareStepExtension(opts) : undefined
      const effectiveMessages = fromExtension?.messages ?? opts.messages
      return {
        ...(fromExtension ?? {}),
        messages: addCacheControl(effectiveMessages, agent.provider),
      }
    }

    const sdkMessages = messages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }))

    const tracer = this.tracer
    const ctx: TraceContext | undefined =
      tracer && runtimeContext
        ? { traceId: runtimeContext.traceId, workspaceId: runtimeContext.workspaceId }
        : undefined

    // P1.4: combine step cap with optional token budget for the streaming path
    const stopWhen: StopCondition<ToolSet>[] = [stepCountIs(agent.config.maxSteps)]
    if (agent.config.tokenBudget && agent.config.tokenBudget > 0) {
      stopWhen.push(tokenBudgetCondition(agent.config.tokenBudget))
    }

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
            stopWhen,
            // P1.3: composed prepareStep — caller extension first, then cache_control
            prepareStep: composedPrepareStep,
            onStepFinish(event) {
              // T1.8 + T1.9 + T1.11: emit spans if tracer is active
              if (tracer && ctx && runtimeContext) {
                const { cacheReadTokens, cacheCreationTokens } = getCacheTokens(event.usage)
                emitStepSpans(tracer, ctx, runtimeContext, agent, {
                  stepNumber: event.stepNumber,
                  text: event.text,
                  finishReason: event.finishReason,
                  usage: event.usage ?? {},
                  cacheReadTokens,
                  cacheCreationTokens,
                  toolCalls: (event.toolCalls ?? []).map((tc) => ({
                    toolName: tc.toolName,
                    toolCallId: tc.toolCallId,
                    input: tc.input,
                  })),
                  toolResults: (event.toolResults ?? []).map((tr) => ({
                    toolCallId: tr.toolCallId,
                    output: tr.output,
                    isError: 'isError' in tr ? Boolean(tr.isError) : false,
                  })),
                })
              }

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
