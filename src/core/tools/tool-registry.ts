import type { AgentToolDefinition } from '@/core/domain/entities/agent-tool'

export class ToolRegistry {
  private readonly tools = new Map<string, AgentToolDefinition>()

  register<TInput, TOutput>(tool: AgentToolDefinition<TInput, TOutput>): void {
    this.tools.set(tool.id, tool as AgentToolDefinition)
  }

  get(id: string): AgentToolDefinition | undefined {
    return this.tools.get(id)
  }

  getByIds(ids: string[]): AgentToolDefinition[] {
    return ids
      .map((id) => this.tools.get(id))
      .filter((t): t is AgentToolDefinition => t !== undefined)
  }

  getAll(): AgentToolDefinition[] {
    return Array.from(this.tools.values())
  }

  has(id: string): boolean {
    return this.tools.has(id)
  }
}
