import type { Codespace, CreateCodespaceOptions } from '../models/codespace-model.ts';
import type { IGhCliWrapper } from '../utils/gh-cli-wrapper.ts';

export interface GitHubCodespaceRepository {
  findAll(repository?: string): Promise<Codespace[]>;
  findByName(name: string): Promise<Codespace | null>;
  create(options: CreateCodespaceOptions): Promise<Codespace>;
  delete(name: string, force?: boolean): Promise<void>;
  deleteAll(repository?: string, olderThanDays?: number): Promise<void>;
}

export class GitHubCodespaceRepositoryImpl implements GitHubCodespaceRepository {
  constructor(private readonly ghWrapper: IGhCliWrapper) {}

  async findAll(repository?: string): Promise<Codespace[]> {
    return await this.ghWrapper.listCodespaces(repository);
  }

  async findByName(name: string): Promise<Codespace | null> {
    try {
      return await this.ghWrapper.getCodespaceStatus(name);
    } catch (error) {
      // If codespace not found, return null instead of throwing
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async create(options: CreateCodespaceOptions): Promise<Codespace> {
    this.validateCreateOptions(options);
    return await this.ghWrapper.createCodespace(options);
  }

  async delete(name: string, force = false): Promise<void> {
    if (!name?.trim()) {
      throw new Error('Codespace name is required for deletion');
    }
    
    await this.ghWrapper.deleteCodespace(name, force);
  }

  async deleteAll(repository?: string, olderThanDays?: number): Promise<void> {
    const codespaces = await this.findAll(repository);
    
    const codesToDelete = olderThanDays 
      ? this.filterOldCodespaces(codespaces, olderThanDays)
      : codespaces;

    // Delete codespaces sequentially to avoid overwhelming the API
    for (const codespace of codesToDelete) {
      try {
        await this.delete(codespace.name, true);
      } catch (error) {
        // Log but don't fail the entire operation if one deletion fails
        console.warn(`Failed to delete codespace ${codespace.name}:`, error);
      }
    }
  }

  private validateCreateOptions(options: CreateCodespaceOptions): void {
    if (!options.repository?.trim()) {
      throw new Error('Repository is required for codespace creation');
    }

    // Validate repository format (owner/repo)
    const repoPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    if (!repoPattern.test(options.repository)) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    if (options.branch && !options.branch.trim()) {
      throw new Error('Branch name cannot be empty');
    }

    if (options.machineType && !options.machineType.trim()) {
      throw new Error('Machine type cannot be empty');
    }

    if (options.retentionPeriod !== undefined) {
      if (!Number.isInteger(options.retentionPeriod) || options.retentionPeriod < 1) {
        throw new Error('Retention period must be a positive integer');
      }
      if (options.retentionPeriod > 30) {
        throw new Error('Retention period cannot exceed 30 days');
      }
    }
  }

  private filterOldCodespaces(codespaces: Codespace[], olderThanDays: number): Codespace[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return codespaces.filter(codespace => {
      const lastUsed = codespace.lastUsedAt || codespace.createdAt;
      return lastUsed < cutoffDate;
    });
  }
}

export function createGitHubCodespaceRepository(ghWrapper: IGhCliWrapper): GitHubCodespaceRepository {
  return new GitHubCodespaceRepositoryImpl(ghWrapper);
}