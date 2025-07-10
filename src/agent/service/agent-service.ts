import { Agent, AgentStatus, createAgent } from "../models/agent-model.ts";
import { AgentRepository } from "../repo/agent-repo.ts";

export class AgentService {
  private repository: AgentRepository;
  private selectedAgentIds: Set<string> = new Set();

  constructor(repository: AgentRepository) {
    this.repository = repository;
  }

  public createAgent(name: string, codespaceId?: string): Agent {
    const agent = createAgent(name, codespaceId);
    return this.repository.create(agent);
  }

  public listAgents(): Agent[] {
    return this.repository.getAll();
  }

  public getAgent(id: string): Agent | undefined {
    return this.repository.getById(id);
  }

  public updateAgent(id: string, updates: Partial<Agent>): Agent | undefined {
    return this.repository.update(id, updates);
  }

  public deleteAgent(id: string): boolean {
    this.selectedAgentIds.delete(id);
    return this.repository.delete(id);
  }

  public selectAgent(id: string): boolean {
    const agent = this.repository.getById(id);
    if (!agent) {
      return false;
    }
    
    this.selectedAgentIds.add(id);
    return true;
  }

  public deselectAgent(id: string): void {
    this.selectedAgentIds.delete(id);
  }

  public toggleAgentSelection(id: string): boolean {
    const agent = this.repository.getById(id);
    if (!agent) {
      return false;
    }

    if (this.selectedAgentIds.has(id)) {
      this.selectedAgentIds.delete(id);
      return false;
    } else {
      this.selectedAgentIds.add(id);
      return true;
    }
  }

  public getSelectedAgents(): Agent[] {
    return Array.from(this.selectedAgentIds)
      .map(id => this.repository.getById(id))
      .filter((agent): agent is Agent => agent !== undefined);
  }

  public getSelectedAgentIds(): string[] {
    return Array.from(this.selectedAgentIds);
  }

  public isAgentSelected(id: string): boolean {
    return this.selectedAgentIds.has(id);
  }

  public clearSelectedAgents(): void {
    this.selectedAgentIds.clear();
  }

  public getAgentCount(): number {
    return this.repository.size();
  }

  public getSelectedAgentCount(): number {
    return this.selectedAgentIds.size;
  }

  public updateAgentStatus(id: string, status: AgentStatus): Agent | undefined {
    return this.repository.update(id, { status });
  }

  public linkAgentToCodespace(agentId: string, codespaceId: string): Agent | undefined {
    return this.repository.update(agentId, { codespaceId });
  }

  public unlinkAgentFromCodespace(agentId: string): Agent | undefined {
    return this.repository.update(agentId, { codespaceId: undefined });
  }

  public getAgentsByCodespace(codespaceId: string): Agent[] {
    return this.repository.getAll().filter(agent => agent.codespaceId === codespaceId);
  }

  public getAgentsWithoutCodespace(): Agent[] {
    return this.repository.getAll().filter(agent => !agent.codespaceId);
  }

  public hasAgentLinkedToCodespace(codespaceId: string): boolean {
    return this.repository.getAll().some(agent => agent.codespaceId === codespaceId);
  }
}

export function createAgentService(repository: AgentRepository): AgentService {
  return new AgentService(repository);
}