import type { AgentRunnerInput, AgentRunResult, AgentRuntimeContext } from '@/adapters/ai/agent-runner.adapter'

/**
 * Port for the agent runner — runs a fully-resolved agent turn (stream or
 * blocking). The adapter `AgentRunnerAdapter` implements this interface.
 *
 * Re-exported adapter types are intentionally public: they describe the
 * shape of a fully-prepared runner call (model + messages + tools already
 * resolved by the use-case layer) and belong in the adapter because they
 * reference AI SDK primitives. The port depends on them for type safety
 * without pulling in the concrete adapter class.
 */
export type { AgentRunnerInput, AgentRunResult, AgentRuntimeContext }

export interface AgentRunnerPort {
  runToCompletion(
    input: AgentRunnerInput,
    runtimeContext?: AgentRuntimeContext,
  ): Promise<AgentRunResult>

  run(
    input: AgentRunnerInput,
    runtimeContext?: AgentRuntimeContext,
  ): ReadableStream<string>
}
