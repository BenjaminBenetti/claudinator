import { Agent } from "../models/agent-model.ts";

export class AgentRepository {
  private agents: Map<string, Agent> = new Map();

  public create(agent: Agent): Agent {
    this.agents.set(agent.id, { ...agent });
    return { ...agent };
  }

  public getAll(): Agent[] {
    return Array.from(this.agents.values()).map(agent => ({ ...agent }));
  }

  public getById(id: string): Agent | undefined {
    const agent = this.agents.get(id);
    return agent ? { ...agent } : undefined;
  }

  public update(id: string, updates: Partial<Agent>): Agent | undefined {
    const existingAgent = this.agents.get(id);
    if (!existingAgent) {
      return undefined;
    }

    const updatedAgent = { ...existingAgent, ...updates, id: existingAgent.id };
    this.agents.set(id, updatedAgent);
    return { ...updatedAgent };
  }

  public delete(id: string): boolean {
    return this.agents.delete(id);
  }

  public clear(): void {
    this.agents.clear();
  }

  public size(): number {
    return this.agents.size;
  }
}

export function createAgentRepository(): AgentRepository {
  return new AgentRepository();
}