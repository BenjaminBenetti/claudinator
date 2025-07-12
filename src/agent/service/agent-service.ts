import { Agent, AgentStatus, createAgent } from "../models/agent-model.ts";
import { AgentRepository } from "../repo/agent-repo.ts";
import { createCompleteGitHubCodespaceService, type GitHubCodespaceService } from "../../github/index.ts";
import { createCompleteGitService, type GitService } from "../../git/index.ts";
import { generateClaudinatorName, isClaudinatorName } from "../../utils/name-generator.ts";
import type { Codespace } from "../../github/models/codespace-model.ts";

export interface CreateAgentOptions {
  repository?: string; // Override auto-detected repo
  branch?: string; // Override auto-detected branch
}

export class AgentService {
  private repository: AgentRepository;
  private selectedAgentIds: Set<string> = new Set();
  private githubCodespaceService: GitHubCodespaceService;
  private gitService: GitService;

  constructor(
    repository: AgentRepository,
    githubCodespaceService: GitHubCodespaceService,
    gitService: GitService
  ) {
    this.repository = repository;
    this.githubCodespaceService = githubCodespaceService;
    this.gitService = gitService;
  }

  public createAgent(name: string, codespaceId?: string): Agent {
    const agent = createAgent(name, codespaceId);
    return this.repository.create(agent);
  }

  public async createAgentWithAutoCodespace(name: string, options?: CreateAgentOptions): Promise<Agent> {
    // Ensure we're in a git repository
    const gitStatus = await this.gitService.getStatus();
    if (!gitStatus.isRepository) {
      throw new Error('Must be in a git repository to create an agent');
    }

    // Ensure GitHub authentication
    await this.githubCodespaceService.ensureAuthenticated();

    // Determine repository and branch
    const repository = options?.repository || gitStatus.githubStatus?.repository;
    const branch = options?.branch || gitStatus.currentBranch || undefined;

    if (!repository) {
      throw new Error('Could not determine GitHub repository. Ensure this is a GitHub repository or specify repository in options.');
    }

    // Try to find an available claudinator codespace to reuse
    const availableCodespace = await this.findAvailableCodespace(repository, branch);
    
    let codespace: Codespace;
    if (availableCodespace) {
      // Reuse existing codespace
      codespace = availableCodespace;
    } else {
      // Create new codespace with claudinator naming
      codespace = await this.githubCodespaceService.createCodespace(repository, branch);
    }

    // Create agent with the codespace ID
    const agent = createAgent(name, codespace.name);
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

  /**
   * Finds an available claudinator codespace that can be reused
   * @param repository The repository to filter by
   * @param branch The branch to match (optional)
   * @returns A codespace that can be reused, or null if none available
   */
  private async findAvailableCodespace(repository: string, branch?: string): Promise<Codespace | null> {
    try {
      // Get all codespaces for the repository
      const codespaces = await this.githubCodespaceService.listCodespaces(repository);
      
      // Filter for claudinator codespaces
      const claudinatorCodespaces = codespaces.filter(codespace => 
        isClaudinatorName(codespace.display_name || '')
      );

      // Get all active agents to check which codespaces are in use
      const activeAgents = this.repository.getAll();
      const activeCodespaceIds = new Set(
        activeAgents
          .map(agent => agent.codespaceId)
          .filter((id): id is string => id !== undefined)
      );

      // Find claudinator codespaces not associated with any active agent
      const availableCodespaces = claudinatorCodespaces.filter(codespace => 
        !activeCodespaceIds.has(codespace.name) &&
        codespace.state === 'Available' // Only reuse codespaces that are ready
      );

      // If branch is specified, prefer codespaces on the same branch
      if (branch && availableCodespaces.length > 0) {
        const branchMatchingCodespaces = availableCodespaces.filter(codespace => 
          codespace.git_status?.ref === branch
        );
        
        if (branchMatchingCodespaces.length > 0) {
          return branchMatchingCodespaces[0];
        }
      }

      // Return the first available codespace, or null if none found
      return availableCodespaces.length > 0 ? availableCodespaces[0] : null;
    } catch (error) {
      console.warn('Failed to find available codespace:', error);
      return null; // Fallback to creating a new codespace
    }
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

  public async createAgentWithCodespace(name: string, repository: string, branch?: string): Promise<Agent> {
    // Ensure GitHub authentication
    await this.githubCodespaceService.ensureAuthenticated();

    // Create codespace for the specified repository/branch
    const codespace = await this.githubCodespaceService.createCodespace(repository, branch);

    // Create agent with the codespace ID
    const agent = createAgent(name, codespace.name);
    return this.repository.create(agent);
  }

  public async ensureAgentCodespace(agentId: string): Promise<boolean> {
    const agent = this.repository.getById(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }

    // If agent already has a codespace, verify it exists
    if (agent.codespaceId) {
      try {
        await this.githubCodespaceService.getCodespaceStatus(agent.codespaceId);
        return true; // Codespace exists and is accessible
      } catch (_error) {
        // Codespace doesn't exist or is inaccessible, will create a new one
        console.warn(`Codespace ${agent.codespaceId} not found for agent ${agentId}, creating new one`);
      }
    }

    // Get git context to create codespace
    const gitStatus = await this.gitService.getStatus();
    if (!gitStatus.isRepository) {
      throw new Error('Must be in a git repository to create codespace for agent');
    }

    const repository = gitStatus.githubStatus?.repository;
    const branch = gitStatus.currentBranch || undefined;

    if (!repository) {
      throw new Error('Could not determine GitHub repository from git context');
    }

    // Create new codespace and link to agent
    const codespace = await this.githubCodespaceService.createCodespace(repository, branch);
    this.repository.update(agentId, { codespaceId: codespace.name });
    
    return true;
  }

  public async recreateAgentCodespace(agentId: string): Promise<boolean> {
    const agent = this.repository.getById(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }

    // Delete existing codespace if it exists
    if (agent.codespaceId) {
      try {
        await this.githubCodespaceService.deleteCodespace(agent.codespaceId);
      } catch (error) {
        // Ignore deletion errors - codespace might already be gone
        console.warn(`Failed to delete existing codespace ${agent.codespaceId}:`, error);
      }
    }

    // Get git context to create new codespace
    const gitStatus = await this.gitService.getStatus();
    if (!gitStatus.isRepository) {
      throw new Error('Must be in a git repository to recreate codespace for agent');
    }

    const repository = gitStatus.githubStatus?.repository;
    const branch = gitStatus.currentBranch || undefined;

    if (!repository) {
      throw new Error('Could not determine GitHub repository from git context');
    }

    // Create new codespace and link to agent
    const codespace = await this.githubCodespaceService.createCodespace(repository, branch);
    this.repository.update(agentId, { codespaceId: codespace.name });
    
    return true;
  }

}

export function createAgentService(repository: AgentRepository): AgentService {
  const githubCodespaceService = createCompleteGitHubCodespaceService();
  const gitService = createCompleteGitService();
  return new AgentService(repository, githubCodespaceService, gitService);
}