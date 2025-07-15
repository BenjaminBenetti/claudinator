import type { ISSHConnectionService } from "./ssh-connection-service.ts";
import type { ITerminalService } from "./terminal-service.ts";
import type { ISSHSessionRepo } from "../repo/ssh-session-repo.ts";
import { createSSHConnectionService } from "./ssh-connection-service.ts";
import { createTerminalService } from "./terminal-service.ts";
import { createSSHSessionRepo } from "../repo/ssh-session-repo.ts";

/**
 * Configuration options for SSH services.
 */
export interface SSHServiceConfig {
  /** Timeout for SSH connection attempts in milliseconds */
  connectionTimeout?: number;
}

/**
 * Container for SSH domain services.
 */
export interface SSHServices {
  /** SSH connection service for managing connections to codespaces */
  connectionService: ISSHConnectionService;
  /** Terminal service for managing terminal state and rendering */
  terminalService: ITerminalService;
  /** SSH session repository for persistence */
  sessionRepo: ISSHSessionRepo;
}

/**
 * Factory function to create SSH services with proper dependency injection.
 * Follows the established service factory pattern used throughout the codebase.
 *
 * @param config - Configuration options for SSH services
 * @returns Complete set of SSH domain services
 */
export function createSSHServices(config?: SSHServiceConfig): SSHServices {
  // Create repository (no dependencies)
  const sessionRepo = createSSHSessionRepo();


  // Create terminal service (no dependencies)
  const terminalService = createTerminalService();

  // Create connection service with optional timeout
  const connectionService = createSSHConnectionService(
    config?.connectionTimeout,
  );

  return {
    connectionService,
    terminalService,
    sessionRepo,
  };
}

/**
 * Default SSH service configuration.
 */
export const DEFAULT_SSH_CONFIG: SSHServiceConfig = {
  connectionTimeout: 30000, // 30 seconds
};
