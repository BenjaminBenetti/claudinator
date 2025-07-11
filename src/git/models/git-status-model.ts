export interface GitStatus {
  isRepository: boolean;
  currentBranch: string | null;
  isDetachedHead: boolean;
  hasUncommittedChanges: boolean;
  workingDirectoryStatus: FileStatus[];
  repository: GitRepository | null;
  remotes: GitRemote[];
  githubStatus: GitHubStatus | null;
}

export interface GitRepository {
  path: string;
  name: string;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitHubStatus {
  isGitHubRepository: boolean;
  repository: string | null; // In "owner/repo" format
  owner: string | null;
  repositoryName: string | null;
  primaryRemote: string | null; // The remote name used (e.g., "origin")
}

export interface FileStatus {
  path: string;
  status: FileStatusType;
  staged: boolean;
}

export type FileStatusType =
  | "modified"
  | "added"
  | "deleted"
  | "untracked"
  | "renamed";

export interface GitCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}
