import {
  Agent,
  AgentStatus,
  createAgent,
  createProvisioningAgent,
} from "../models/agent-model.ts";
import { AgentRepository } from "../repo/agent-repo.ts";
import {
  createCompleteGitHubCodespaceService,
  type GitHubCodespaceService,
} from "../../github/index.ts";
import { createCompleteGitService, type GitService } from "../../git/index.ts";
import { isClaudinatorName } from "../../utils/name-generator.ts";
import type { Codespace } from "../../github/models/codespace-model.ts";

export interface CreateAgentOptions {
  repository?: string; // Override auto-detected repo
  branch?: string; // Override auto-detected branch
}

export class AgentService {
  private repository: AgentRepository;
  private githubCodespaceService: GitHubCodespaceService;
  private gitService: GitService;

  constructor(
    repository: AgentRepository,
    githubCodespaceService: GitHubCodespaceService,
    gitService: GitService,
  ) {
    this.repository = repository;
    this.githubCodespaceService = githubCodespaceService;
    this.gitService = gitService;
  }

  public createAgent(name: string, codespaceId?: string): Agent {
    const agent = createAgent(name, codespaceId);
    return this.repository.create(agent);
  }

  public async createAgentWithAutoCodespace(
    name: string,
    options?: CreateAgentOptions,
  ): Promise<Agent> {
    // Create agent immediately with provisioning status
    const provisioningAgent = createProvisioningAgent(name);
    const agent = this.repository.create(provisioningAgent);

    // Start codespace provisioning in background
    this.provisionCodespaceForAgent(agent.id, options).catch((error) => {
      // Update agent status to error if provisioning fails
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.repository.update(agent.id, {
        status: AgentStatus.Error,
        errorMessage,
      });
      console.error(
        `Failed to provision codespace for agent ${agent.id}:`,
        error,
      );
    });

    return agent;
  }

  private async provisionCodespaceForAgent(
    agentId: string,
    options?: CreateAgentOptions,
  ): Promise<void> {
    try {
      // Ensure we're in a git repository
      const gitStatus = await this.gitService.getStatus();
      if (!gitStatus.isRepository) {
        throw new Error("Must be in a git repository to create an agent");
      }

      // Ensure GitHub authentication
      await this.githubCodespaceService.ensureAuthenticated();

      // Determine repository and branch
      const repository = options?.repository ||
        gitStatus.githubStatus?.repository;
      const branch = options?.branch || gitStatus.currentBranch || undefined;

      if (!repository) {
        throw new Error(
          "Could not determine GitHub repository. Ensure this is a GitHub repository or specify repository in options.",
        );
      }

      // Try to find an available claudinator codespace to reuse
      const availableCodespace = await this.findAvailableCodespace(
        repository,
        branch,
      );

      let codespace: Codespace;
      if (availableCodespace) {
        // Reuse existing codespace
        codespace = availableCodespace;

        // If the codespace is stopped, start it
        if (codespace.state === "Shutdown") {
          console.log(
            `Starting stopped codespace: ${
              codespace.display_name || codespace.name
            }`,
          );
          codespace = await this.githubCodespaceService.startCodespace(
            codespace.name,
          );
        } else {
          console.log(
            `Reusing available codespace: ${
              codespace.display_name || codespace.name
            }`,
          );
        }
      } else {
        // Create new codespace with claudinator naming
        codespace = await this.githubCodespaceService.createCodespace(
          repository,
          branch,
        );
      }

      // Update agent with codespace ID and set status to idle
      this.repository.update(agentId, {
        codespaceId: codespace.name,
        codespaceDisplayName: codespace.display_name || undefined,
        status: AgentStatus.Idle,
      });
    } catch (error) {
      // Update agent status to error if provisioning fails
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      this.repository.update(agentId, {
        status: AgentStatus.Error,
        errorMessage,
      });
      throw error;
    }
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
    return this.repository.delete(id);
  }

  public getAgentCount(): number {
    return this.repository.size();
  }

  public updateAgentStatus(id: string, status: AgentStatus): Agent | undefined {
    return this.repository.update(id, { status });
  }

  /**
   * Finds an available claudinator codespace that can be reused
   * Includes both running (Available) and stopped (Shutdown) codespaces
   * Prioritizes running codespaces and branch matches for optimal performance
   * @param repository The repository to filter by
   * @param branch The branch to match (optional)
   * @returns A codespace that can be reused, or null if none available
   */
  private async findAvailableCodespace(
    repository: string,
    branch?: string,
  ): Promise<Codespace | null> {
    try {
      // Get all codespaces for the repository
      const codespaces = await this.githubCodespaceService.listCodespaces(
        repository,
      );

      // Filter for claudinator codespaces
      const claudinatorCodespaces = codespaces.filter((codespace) =>
        isClaudinatorName(codespace.display_name || "")
      );

      // Get all active agents to check which codespaces are in use
      const activeAgents = this.repository.getAll();
      const activeCodespaceIds = new Set(
        activeAgents
          .map((agent) => agent.codespaceId)
          .filter((id): id is string => id !== undefined),
      );

      // Find claudinator codespaces not associated with any active agent
      // Include both Available and Shutdown (stopped) codespaces for reuse
      const availableCodespaces = claudinatorCodespaces.filter((codespace) =>
        !activeCodespaceIds.has(codespace.name) &&
        (codespace.state === "Available" || codespace.state === "Shutdown")
      );

      // Prioritize Available codespaces over Shutdown ones (faster to use)
      const runningCodespaces = availableCodespaces.filter((cs) =>
        cs.state === "Available"
      );
      const stoppedCodespaces = availableCodespaces.filter((cs) =>
        cs.state === "Shutdown"
      );

      // If branch is specified, prefer codespaces on the same branch
      if (branch && availableCodespaces.length > 0) {
        // First try running codespaces on the correct branch
        const runningBranchMatches = runningCodespaces.filter((codespace) =>
          codespace.git_status?.ref === branch
        );
        if (runningBranchMatches.length > 0) {
          return runningBranchMatches[0];
        }

        // Then try stopped codespaces on the correct branch
        const stoppedBranchMatches = stoppedCodespaces.filter((codespace) =>
          codespace.git_status?.ref === branch
        );
        if (stoppedBranchMatches.length > 0) {
          return stoppedBranchMatches[0];
        }
      }

      // Fallback: prefer running codespaces, then stopped ones
      if (runningCodespaces.length > 0) {
        return runningCodespaces[0];
      }

      return stoppedCodespaces.length > 0 ? stoppedCodespaces[0] : null;
    } catch (error) {
      console.warn("Failed to find available codespace:", error);
      return null; // Fallback to creating a new codespace
    }
  }

  public async linkAgentToCodespace(
    agentId: string,
    codespaceId: string,
  ): Promise<Agent | undefined> {
    try {
      // Get codespace details to extract display name
      const codespace = await this.githubCodespaceService.getCodespaceStatus(
        codespaceId,
      );
      return this.repository.update(agentId, {
        codespaceId,
        codespaceDisplayName: codespace.display_name || undefined,
      });
    } catch (error) {
      // If we can't get codespace details, just link with the ID
      return this.repository.update(agentId, { codespaceId });
    }
  }

  public unlinkAgentFromCodespace(agentId: string): Agent | undefined {
    return this.repository.update(agentId, {
      codespaceId: undefined,
      codespaceDisplayName: undefined,
    });
  }

  public getAgentsByCodespace(codespaceId: string): Agent[] {
    return this.repository.getAll().filter((agent) =>
      agent.codespaceId === codespaceId
    );
  }

  public getAgentsWithoutCodespace(): Agent[] {
    return this.repository.getAll().filter((agent) => !agent.codespaceId);
  }

  public hasAgentLinkedToCodespace(codespaceId: string): boolean {
    return this.repository.getAll().some((agent) =>
      agent.codespaceId === codespaceId
    );
  }

  /**
   * Attaches an SSH session to an agent.
   *
   * @param agentId - ID of the agent
   * @param sessionId - ID of the SSH session to attach
   * @returns Updated agent or undefined if agent not found
   */
  public async attachSSHSession(
    agentId: string,
    sessionId: string,
  ): Promise<Agent | undefined> {
    return this.repository.update(agentId, { sshSessionId: sessionId });
  }

  /**
   * Detaches the SSH session from an agent.
   *
   * @param agentId - ID of the agent
   * @returns Updated agent or undefined if agent not found
   */
  public async detachSSHSession(agentId: string): Promise<Agent | undefined> {
    return this.repository.update(agentId, { sshSessionId: undefined });
  }

  /**
   * Gets all agents that have active shell sessions.
   *
   * @returns Array of agents with active SSH sessions
   */
  public getAgentsWithActiveShells(): Agent[] {
    return this.repository.getAll().filter((agent) =>
      agent.sshSessionId !== undefined
    );
  }

  /**
   * Terminates the shell session for an agent by detaching it.
   * Note: This only detaches the session reference from the agent.
   * The actual SSH session termination should be handled by the SSH service.
   *
   * @param agentId - ID of the agent
   */
  public async terminateAgentShell(agentId: string): Promise<void> {
    await this.detachSSHSession(agentId);
  }
}

export function createAgentService(repository: AgentRepository): AgentService {
  const githubCodespaceService = createCompleteGitHubCodespaceService();
  const gitService = createCompleteGitService();
  return new AgentService(repository, githubCodespaceService, gitService);
}
