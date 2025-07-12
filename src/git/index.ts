// Git Domain Exports
// This module provides all types, interfaces, and services for Git repository management

import { GitCommandExecutor } from "./service/git-command-executor.ts";
import { createGitService, type GitService } from "./service/git-service.ts";

// Models
export type {
  FileStatus,
  GitCommandResult,
  GitHubStatus,
  GitRemote,
  GitRepository,
  GitStatus,
} from "./models/git-status-model.ts";

// Command Executor
export {
  GitCommandError,
  GitCommandExecutor,
  NotAGitRepositoryError,
} from "./service/git-command-executor.ts";

export type { IGitCommandExecutor } from "./service/git-command-executor.ts";

// Service Layer
export {
  createGitService,
  GitServiceError,
  GitServiceImpl,
} from "./service/git-service.ts";

export type { GitService } from "./service/git-service.ts";

/**
 * Creates a complete Git service with all dependencies
 *
 * @param timeout - Optional timeout for git operations in milliseconds (default: 5000)
 * @returns Fully configured GitService instance
 *
 * @example
 * ```typescript
 * import { createCompleteGitService } from './git/index.ts';
 *
 * const service = createCompleteGitService();
 * const status = await service.getStatus();
 * ```
 */
export function createCompleteGitService(timeout?: number): GitService {
  const commandExecutor = new GitCommandExecutor(timeout);
  return createGitService(commandExecutor);
}
