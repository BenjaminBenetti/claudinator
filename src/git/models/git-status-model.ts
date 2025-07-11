export interface GitStatus {
  isRepository: boolean;
  currentBranch: string | null;
  isDetachedHead: boolean;
  hasUncommittedChanges: boolean;
  workingDirectoryStatus: FileStatus[];
  repository: GitRepository | null;
  remotes: GitRemote[];
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
