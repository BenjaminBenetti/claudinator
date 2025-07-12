import type { Codespace, CreateCodespaceOptions } from '../models/codespace-model.ts';
import type { IOctokitClient } from '../utils/octokit-client.ts';

export class GitHubRepositoryError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'GitHubRepositoryError';
  }
}

export interface GitHubCodespaceRepository {
  findAll(repository?: string): Promise<Codespace[]>;
  findByName(name: string): Promise<Codespace | null>;
  create(owner: string, repo: string, options: CreateCodespaceOptions): Promise<Codespace>;
  delete(name: string): Promise<void>;
  deleteAll(repository?: string, olderThanDays?: number): Promise<void>;
  startCodespace(name: string): Promise<Codespace>;
  stopCodespace(name: string): Promise<Codespace>;
}

export class GitHubCodespaceRepositoryImpl implements GitHubCodespaceRepository {
  constructor(private readonly octokitClient: IOctokitClient) {}

  /**
   * Lists all codespaces for the authenticated user
   * @param repository Optional repository filter in "owner/repo" format
   * @returns Promise resolving to array of codespaces
   */
  async findAll(repository?: string): Promise<Codespace[]> {
    try {
      const octokit = await this.octokitClient.getOctokit();
      
      if (repository) {
        const [owner, repo] = this.parseRepository(repository);
        const response = await octokit.rest.codespaces.listInRepositoryForAuthenticatedUser({
          owner,
          repo,
        });
        return response.data.codespaces;
      } else {
        const response = await octokit.rest.codespaces.listForAuthenticatedUser();
        return response.data.codespaces;
      }
    } catch (error) {
      throw new GitHubRepositoryError(
        'Failed to list codespaces',
        'findAll',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Finds a specific codespace by name
   * @param name The codespace name
   * @returns Promise resolving to codespace or null if not found
   */
  async findByName(name: string): Promise<Codespace | null> {
    try {
      const octokit = await this.octokitClient.getOctokit();
      const response = await octokit.rest.codespaces.getForAuthenticatedUser({
        codespace_name: name,
      });
      return response.data;
    } catch (error: any) {
      // If codespace not found, return null instead of throwing
      if (error?.status === 404) {
        return null;
      }
      throw new GitHubRepositoryError(
        `Failed to get codespace ${name}`,
        'findByName',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Creates a new codespace
   * @param owner Repository owner
   * @param repo Repository name
   * @param options Codespace creation options
   * @returns Promise resolving to created codespace
   */
  async create(owner: string, repo: string, options: CreateCodespaceOptions): Promise<Codespace> {
    // Validate inputs first (let validation errors bubble up)
    this.validateCreateOptions(owner, repo, options);

    try {
      const octokit = await this.octokitClient.getOctokit();

      // First, get the repository information to obtain the repository ID
      const repoResponse = await octokit.rest.repos.get({
        owner,
        repo,
      });

      const response = await octokit.rest.codespaces.createForAuthenticatedUser({
        repository_id: repoResponse.data.id,
        ref: options.ref,
        location: options.location,
        geo: options.geo,
        client_ip: options.client_ip,
        machine: options.machine,
        devcontainer_path: options.devcontainer_path,
        multi_repo_permissions_opt_out: options.multi_repo_permissions_opt_out,
        working_directory: options.working_directory,
        idle_timeout_minutes: options.idle_timeout_minutes,
        display_name: options.display_name,
        retention_period_minutes: options.retention_period_minutes,
      });

      return response.data;
    } catch (error) {
      throw new GitHubRepositoryError(
        `Failed to create codespace for ${owner}/${repo}`,
        'create',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Deletes a codespace
   * @param name The codespace name
   * @returns Promise that resolves when deletion is complete
   */
  async delete(name: string): Promise<void> {
    if (!name?.trim()) {
      throw new GitHubRepositoryError(
        'Codespace name is required for deletion',
        'delete'
      );
    }
    
    try {
      const octokit = await this.octokitClient.getOctokit();
      await octokit.rest.codespaces.deleteForAuthenticatedUser({
        codespace_name: name,
      });
    } catch (error) {
      throw new GitHubRepositoryError(
        `Failed to delete codespace ${name}`,
        'delete',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Deletes multiple codespaces based on filters
   * @param repository Optional repository filter
   * @param olderThanDays Optional age filter in days
   * @returns Promise that resolves when all deletions are complete
   */
  async deleteAll(repository?: string, olderThanDays?: number): Promise<void> {
    try {
      const codespaces = await this.findAll(repository);
      
      const codesToDelete = olderThanDays 
        ? this.filterOldCodespaces(codespaces, olderThanDays)
        : codespaces;

      // Delete codespaces sequentially to avoid overwhelming the API
      for (const codespace of codesToDelete) {
        try {
          await this.delete(codespace.name);
        } catch (error) {
          // Log but don't fail the entire operation if one deletion fails
          console.warn(`Failed to delete codespace ${codespace.name}:`, error);
        }
      }
    } catch (error) {
      throw new GitHubRepositoryError(
        'Failed to delete codespaces',
        'deleteAll',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Starts a stopped codespace
   * @param name The codespace name
   * @returns Promise resolving to the started codespace
   */
  async startCodespace(name: string): Promise<Codespace> {
    try {
      const octokit = await this.octokitClient.getOctokit();
      const response = await octokit.rest.codespaces.startForAuthenticatedUser({
        codespace_name: name,
      });
      return response.data;
    } catch (error) {
      throw new GitHubRepositoryError(
        `Failed to start codespace ${name}`,
        'startCodespace',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Stops a running codespace
   * @param name The codespace name
   * @returns Promise resolving to the stopped codespace
   */
  async stopCodespace(name: string): Promise<Codespace> {
    try {
      const octokit = await this.octokitClient.getOctokit();
      const response = await octokit.rest.codespaces.stopForAuthenticatedUser({
        codespace_name: name,
      });
      return response.data;
    } catch (error) {
      throw new GitHubRepositoryError(
        `Failed to stop codespace ${name}`,
        'stopCodespace',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private parseRepository(repository: string): [string, string] {
    const parts = repository.split('/');
    if (parts.length !== 2) {
      throw new GitHubRepositoryError(
        'Repository must be in format "owner/repo"',
        'parseRepository'
      );
    }
    return [parts[0], parts[1]];
  }

  private validateCreateOptions(owner: string, repo: string, options: CreateCodespaceOptions): void {
    if (!owner?.trim()) {
      throw new GitHubRepositoryError('Owner is required for codespace creation', 'validateCreateOptions');
    }

    if (!repo?.trim()) {
      throw new GitHubRepositoryError('Repository name is required for codespace creation', 'validateCreateOptions');
    }

    // Validate owner and repo format
    const namePattern = /^[a-zA-Z0-9._-]+$/;
    if (!namePattern.test(owner)) {
      throw new GitHubRepositoryError('Invalid owner name format', 'validateCreateOptions');
    }

    if (!namePattern.test(repo)) {
      throw new GitHubRepositoryError('Invalid repository name format', 'validateCreateOptions');
    }

    if (options.ref && !options.ref.trim()) {
      throw new GitHubRepositoryError('Branch/ref name cannot be empty', 'validateCreateOptions');
    }

    if (options.machine && !options.machine.trim()) {
      throw new GitHubRepositoryError('Machine type cannot be empty', 'validateCreateOptions');
    }

    if (options.retention_period_minutes !== undefined) {
      if (!Number.isInteger(options.retention_period_minutes) || options.retention_period_minutes < 1) {
        throw new GitHubRepositoryError('Retention period must be a positive integer', 'validateCreateOptions');
      }
      // Maximum retention period is 30 days (43200 minutes)
      if (options.retention_period_minutes > 43200) {
        throw new GitHubRepositoryError('Retention period cannot exceed 30 days', 'validateCreateOptions');
      }
    }

    if (options.idle_timeout_minutes !== undefined) {
      if (!Number.isInteger(options.idle_timeout_minutes) || options.idle_timeout_minutes < 5) {
        throw new GitHubRepositoryError('Idle timeout must be at least 5 minutes', 'validateCreateOptions');
      }
      if (options.idle_timeout_minutes > 240) {
        throw new GitHubRepositoryError('Idle timeout cannot exceed 240 minutes', 'validateCreateOptions');
      }
    }
  }

  private filterOldCodespaces(codespaces: Codespace[], olderThanDays: number): Codespace[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return codespaces.filter(codespace => {
      const lastUsed = new Date(codespace.last_used_at || codespace.created_at);
      return lastUsed < cutoffDate;
    });
  }
}

/**
 * Factory function to create a GitHubCodespaceRepository instance
 * @param octokitClient The Octokit client to use
 * @returns A new GitHubCodespaceRepository instance
 */
export function createGitHubCodespaceRepository(octokitClient: IOctokitClient): GitHubCodespaceRepository {
  return new GitHubCodespaceRepositoryImpl(octokitClient);
}