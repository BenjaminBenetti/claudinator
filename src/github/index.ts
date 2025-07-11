// GitHub Domain Exports
// This module provides all types, interfaces, and services for GitHub Codespace management

import { createGhCliWrapper } from './utils/gh-cli-wrapper.ts';
import { createGitHubCodespaceRepository } from './repo/github-codespace-repo.ts';
import { createGitHubCodespaceService, type GitHubCodespaceService } from './service/github-codespace-service.ts';

// Models
export type {
  Codespace,
  CodespaceState,
  CreateCodespaceOptions,
} from './models/codespace-model.ts';

export type {
  GitHubRepository,
} from './models/github-repository-model.ts';

// CLI Wrapper
export {
  GhCliWrapper,
  GitHubCliError,
  createGhCliWrapper,
} from './utils/gh-cli-wrapper.ts';

export type {
  GhCommandResult,
} from './utils/gh-cli-wrapper.ts';

// Repository Layer
export {
  GitHubCodespaceRepositoryImpl,
  createGitHubCodespaceRepository,
} from './repo/github-codespace-repo.ts';

export type {
  GitHubCodespaceRepository,
} from './repo/github-codespace-repo.ts';

// Service Layer
export {
  GitHubCodespaceServiceImpl,
  GitHubCodespaceServiceError,
  createGitHubCodespaceService,
} from './service/github-codespace-service.ts';

export type {
  GitHubCodespaceService,
} from './service/github-codespace-service.ts';

/**
 * Creates a complete GitHub Codespace service with all dependencies
 * 
 * @param timeout - Optional timeout for CLI operations in milliseconds (default: 30000)
 * @returns Fully configured GitHubCodespaceService instance
 * 
 * @example
 * ```typescript
 * import { createCompleteGitHubCodespaceService } from './github/index.ts';
 * 
 * const service = createCompleteGitHubCodespaceService();
 * const codespaces = await service.listCodespaces();
 * ```
 */
export function createCompleteGitHubCodespaceService(timeout?: number): GitHubCodespaceService {
  const ghWrapper = createGhCliWrapper(timeout);
  const repository = createGitHubCodespaceRepository(ghWrapper);
  return createGitHubCodespaceService(repository, ghWrapper);
}