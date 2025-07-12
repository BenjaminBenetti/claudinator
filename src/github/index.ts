// GitHub Domain Exports
// This module provides all types, interfaces, and services for GitHub Codespace management

import { createGitHubAuthService } from "./service/github-auth-service.ts";
import { createOctokitClient } from "./utils/octokit-client.ts";
import { createGitHubCodespaceRepository } from "./repo/github-codespace-repo.ts";
import {
  createGitHubCodespaceService,
  type GitHubCodespaceService,
} from "./service/github-codespace-service.ts";

// Models
export type {
  Codespace,
  CodespaceMachine,
  CreateCodespaceOptions,
} from "./models/codespace-model.ts";

export type { GitHubRepository } from "./models/github-repository-model.ts";

// Authentication Service
export {
  createGitHubAuthService,
  GitHubAuthError,
  GitHubAuthService,
} from "./service/github-auth-service.ts";

export type { IGitHubAuthService } from "./service/github-auth-service.ts";

// Octokit Client
export {
  createOctokitClient,
  GitHubApiError,
  OctokitClient,
} from "./utils/octokit-client.ts";

export type { IOctokitClient } from "./utils/octokit-client.ts";

// Repository Layer
export {
  createGitHubCodespaceRepository,
  GitHubCodespaceRepositoryImpl,
  GitHubRepositoryError,
} from "./repo/github-codespace-repo.ts";

export type {
  GitHubCodespaceRepository,
} from "./repo/github-codespace-repo.ts";

// Service Layer
export {
  createGitHubCodespaceService,
  GitHubCodespaceServiceError,
  GitHubCodespaceServiceImpl,
} from "./service/github-codespace-service.ts";

export type {
  GitHubCodespaceService,
} from "./service/github-codespace-service.ts";

// Error Handling
export {
  createGitHubApiError,
  GitHubApiError as GitHubApiErrorExport,
  withGitHubApiErrorHandling,
} from "./errors/github-api-error.ts";

// Configuration
export {
  createConfigFromEnvironment,
  createGitHubConfigService,
  DEFAULT_GITHUB_CONFIG,
  GitHubConfigService,
} from "./config/github-config.ts";

export type {
  GitHubConfig,
  IGitHubConfigService,
} from "./config/github-config.ts";

/**
 * Creates a complete GitHub Codespace service with all dependencies using Octokit
 *
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
export function createCompleteGitHubCodespaceService(): GitHubCodespaceService {
  const authService = createGitHubAuthService();
  const octokitClient = createOctokitClient(authService);
  const repository = createGitHubCodespaceRepository(octokitClient);
  return createGitHubCodespaceService(repository, authService);
}
