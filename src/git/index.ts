// Git Domain Exports
// This module provides all types, interfaces, and services for Git repository management

import { GitCommandExecutor } from './service/git-command-executor.ts';
import { createGitService, type GitService } from './service/git-service.ts';

// Models
export type {
  GitStatus,
  GitRepository,
  GitRemote,
  GitHubStatus,
  FileStatus,
  GitCommandResult,
} from './models/git-status-model.ts';

// Command Executor
export {
  GitCommandExecutor,
  GitCommandError,
  NotAGitRepositoryError,
} from './service/git-command-executor.ts';

export type {
  IGitCommandExecutor,
} from './service/git-command-executor.ts';

// Service Layer
export {
  GitServiceImpl,
  GitServiceError,
  createGitService,
} from './service/git-service.ts';

export type {
  GitService,
} from './service/git-service.ts';

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