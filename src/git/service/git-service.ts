import type { GitRepository, GitStatus } from "../models/git-status-model.ts";
import type { IGitCommandExecutor } from "./git-command-executor.ts";

export interface GitService {
  getStatus(workingDirectory?: string): Promise<GitStatus>;
}

export class GitServiceError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public override readonly cause?: Error,
  ) {
    super(message);
    this.name = "GitServiceError";
  }
}

export class GitServiceImpl implements GitService {
  constructor(private readonly commandExecutor: IGitCommandExecutor) {}

  async getStatus(workingDirectory?: string): Promise<GitStatus> {
    const workDir = workingDirectory || Deno.cwd();

    // First check if we're in a git repository
    const isRepository = await this.commandExecutor.checkIsRepository(workDir);

    if (!isRepository) {
      return {
        isRepository: false,
        currentBranch: null,
        isDetachedHead: false,
        hasUncommittedChanges: false,
        workingDirectoryStatus: [],
        repository: null,
        remotes: [],
      };
    }

    // Get all git information in parallel for efficiency
    const [
      currentBranch,
      workingDirectoryStatus,
      remotes,
      repositoryRoot,
    ] = await Promise.all([
      this.commandExecutor.getCurrentBranch(workDir),
      this.commandExecutor.getWorkingDirectoryStatus(workDir),
      this.commandExecutor.getRemotes(workDir),
      this.getRepository(workDir),
    ]);

    const isDetachedHead = currentBranch === null;
    const hasUncommittedChanges = workingDirectoryStatus.length > 0;

    return {
      isRepository: true,
      currentBranch,
      isDetachedHead,
      hasUncommittedChanges,
      workingDirectoryStatus,
      repository: repositoryRoot,
      remotes,
    };
  }

  private async getRepository(
    workingDirectory: string,
  ): Promise<GitRepository | null> {
    const repositoryRoot = await this.commandExecutor.getRepositoryRoot(
      workingDirectory,
    );
    const repositoryName = this.extractRepositoryName(repositoryRoot);

    return {
      path: repositoryRoot,
      name: repositoryName,
    };
  }

  private extractRepositoryName(repositoryPath: string): string {
    const pathParts = repositoryPath.split("/");
    return pathParts[pathParts.length - 1] || "unknown";
  }
}

export function createGitService(
  commandExecutor: IGitCommandExecutor,
): GitService {
  return new GitServiceImpl(commandExecutor);
}
