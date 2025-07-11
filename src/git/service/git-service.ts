import type { GitRepository, GitStatus, GitHubStatus, GitRemote } from "../models/git-status-model.ts";
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
        githubStatus: null,
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
    const githubStatus = this.extractGitHubStatus(remotes);

    return {
      isRepository: true,
      currentBranch,
      isDetachedHead,
      hasUncommittedChanges,
      workingDirectoryStatus,
      repository: repositoryRoot,
      remotes,
      githubStatus,
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

  private extractGitHubStatus(remotes: GitRemote[]): GitHubStatus {
    // Try to find origin remote first
    const originRemote = remotes.find(remote => remote.name === 'origin');
    const targetRemote = originRemote || remotes[0];

    if (!targetRemote) {
      return {
        isGitHubRepository: false,
        repository: null,
        owner: null,
        repositoryName: null,
        primaryRemote: null,
      };
    }

    const githubInfo = this.parseGitHubUrl(targetRemote.fetchUrl || targetRemote.pushUrl);
    
    return {
      isGitHubRepository: githubInfo !== null,
      repository: githubInfo ? `${githubInfo.owner}/${githubInfo.repo}` : null,
      owner: githubInfo?.owner || null,
      repositoryName: githubInfo?.repo || null,
      primaryRemote: targetRemote.name,
    };
  }

  private parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Handle GitHub URLs: https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const httpsMatch = url.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    const sshMatch = url.match(/git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    if (sshMatch) {
      return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    return null;
  }
}

export function createGitService(
  commandExecutor: IGitCommandExecutor,
): GitService {
  return new GitServiceImpl(commandExecutor);
}
