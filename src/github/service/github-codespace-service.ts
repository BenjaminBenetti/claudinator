import type {
  Codespace,
  CreateCodespaceOptions,
} from "../models/codespace-model.ts";
import type { GitHubCodespaceRepository } from "../repo/github-codespace-repo.ts";
import type { IGitHubAuthService } from "./github-auth-service.ts";
import { generateClaudinatorName } from "../../utils/name-generator.ts";

export interface GitHubCodespaceService {
  ensureAuthenticated(): Promise<void>;
  listCodespaces(repository?: string): Promise<Codespace[]>;
  createCodespace(repository: string, branch?: string): Promise<Codespace>;
  deleteCodespace(name: string): Promise<void>;
  getCodespaceStatus(name: string): Promise<Codespace>;
  cleanupOldCodespaces(
    repository?: string,
    olderThanDays?: number,
  ): Promise<number>;
  startCodespace(name: string): Promise<Codespace>;
  stopCodespace(name: string): Promise<Codespace>;
}

export class GitHubCodespaceServiceError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = "GitHubCodespaceServiceError";
  }
}

export class GitHubCodespaceServiceImpl implements GitHubCodespaceService {
  constructor(
    private readonly repository: GitHubCodespaceRepository,
    private readonly authService: IGitHubAuthService,
  ) {}

  public async ensureAuthenticated(): Promise<void> {
    await this.authService.ensureAuthenticated();
  }

  async listCodespaces(repository?: string): Promise<Codespace[]> {
    try {
      await this.ensureAuthenticated();

      if (repository) {
        this.validateRepositoryFormat(repository);
      }

      return await this.repository.findAll(repository);
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to list codespaces: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "listCodespaces",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async createCodespace(
    repository: string,
    branch?: string,
  ): Promise<Codespace> {
    try {
      await this.ensureAuthenticated();
      this.validateRepositoryFormat(repository);

      if (branch !== undefined) {
        this.validateBranchName(branch);
      }

      const [owner, repo] = repository.split("/");
      const options: CreateCodespaceOptions = {
        ref: branch || "main",
        machine: "basicLinux32gb",
        display_name: generateClaudinatorName(), // Use claudinator naming convention
      };

      const codespace = await this.repository.create(owner, repo, options);

      // Wait for codespace to be in a stable state before returning
      await this.waitForCodespaceReady(codespace.name);

      return await this.getCodespaceStatus(codespace.name);
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to create codespace: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "createCodespace",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async deleteCodespace(name: string): Promise<void> {
    try {
      await this.ensureAuthenticated();
      this.validateCodespaceName(name);

      // Verify codespace exists before attempting deletion
      const codespace = await this.repository.findByName(name);
      if (!codespace) {
        throw new Error(`Codespace '${name}' not found`);
      }

      await this.repository.delete(name);
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to delete codespace: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "deleteCodespace",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async getCodespaceStatus(name: string): Promise<Codespace> {
    try {
      await this.ensureAuthenticated();
      this.validateCodespaceName(name);

      const codespace = await this.repository.findByName(name);
      if (!codespace) {
        throw new Error(`Codespace '${name}' not found`);
      }

      return codespace;
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to get codespace status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "getCodespaceStatus",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async cleanupOldCodespaces(
    repository?: string,
    olderThanDays = 7,
  ): Promise<number> {
    try {
      await this.authService.ensureAuthenticated();

      if (repository) {
        this.validateRepositoryFormat(repository);
      }

      if (olderThanDays < 1) {
        throw new Error("olderThanDays must be at least 1");
      }

      const allCodespaces = await this.repository.findAll(repository);
      const codesToDelete = this.filterOldCodespaces(
        allCodespaces,
        olderThanDays,
      );

      if (codesToDelete.length === 0) {
        return 0;
      }

      // Delete old codespaces and count successful deletions
      let deletedCount = 0;
      for (const codespace of codesToDelete) {
        try {
          await this.repository.delete(codespace.name);
          deletedCount++;
        } catch (error) {
          console.warn(`Failed to delete codespace ${codespace.name}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to cleanup old codespaces: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "cleanupOldCodespaces",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async startCodespace(name: string): Promise<Codespace> {
    try {
      await this.authService.ensureAuthenticated();
      this.validateCodespaceName(name);

      return await this.repository.startCodespace(name);
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to start codespace: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "startCodespace",
        error instanceof Error ? error : undefined,
      );
    }
  }

  async stopCodespace(name: string): Promise<Codespace> {
    try {
      await this.authService.ensureAuthenticated();
      this.validateCodespaceName(name);

      return await this.repository.stopCodespace(name);
    } catch (error) {
      throw new GitHubCodespaceServiceError(
        `Failed to stop codespace: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "stopCodespace",
        error instanceof Error ? error : undefined,
      );
    }
  }

  private validateRepositoryFormat(repository: string): void {
    if (!repository?.trim()) {
      throw new Error("Repository is required");
    }

    const repoPattern = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;
    if (!repoPattern.test(repository)) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    const parts = repository.split("/");
    if (parts.length !== 2) {
      throw new Error('Repository must be in format "owner/repo"');
    }

    const [owner, repo] = parts;
    if (!owner.trim() || !repo.trim()) {
      throw new Error("Owner and repository name cannot be empty");
    }
  }

  private validateBranchName(branch: string): void {
    if (!branch?.trim()) {
      throw new Error("Branch name cannot be empty");
    }

    // Basic branch name validation (GitHub allows most characters)
    if (
      branch.includes("..") || branch.startsWith("/") || branch.endsWith("/")
    ) {
      throw new Error("Invalid branch name format");
    }

    if (branch.length > 250) {
      throw new Error("Branch name is too long (max 250 characters)");
    }
  }

  private validateCodespaceName(name: string): void {
    if (!name?.trim()) {
      throw new Error("Codespace name is required");
    }
  }

  private filterOldCodespaces(
    codespaces: Codespace[],
    olderThanDays: number,
  ): Codespace[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    return codespaces.filter((codespace) => {
      const lastUsed = new Date(codespace.last_used_at || codespace.created_at);
      return lastUsed < cutoffDate;
    });
  }

  private async waitForCodespaceReady(
    name: string,
    maxAttempts = 10,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const status = await this.repository.findByName(name);
        if (status && ["Available", "Unknown"].includes(status.state)) {
          return; // Codespace is in a stable state
        }

        // Wait before next attempt (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        // Continue trying even if status check fails
        if (attempt === maxAttempts) {
          console.warn(`Failed to verify codespace ${name} is ready:`, error);
        }
      }
    }
  }
}

export function createGitHubCodespaceService(
  repository: GitHubCodespaceRepository,
  authService: IGitHubAuthService,
): GitHubCodespaceService {
  return new GitHubCodespaceServiceImpl(repository, authService);
}
