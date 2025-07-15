import type { ITTYService } from "./tty-service.ts";
import { createTTYService } from "./tty-service.ts";

/**
 * Configuration options for TTY services.
 */
export interface TTYServiceConfig {
  /** Maximum number of lines to keep in buffer per session */
  maxBufferLines?: number;
  /** Default terminal width in characters */
  defaultCols?: number;
  /** Default terminal height in characters */
  defaultRows?: number;
  /** Whether to enable debug logging for ANSI sequences */
  debugAnsiSequences?: boolean;
}

/**
 * Container for TTY domain services.
 */
export interface TTYServices {
  /** TTY service for processing terminal output and managing buffers */
  ttyService: ITTYService;
}

/**
 * Factory function to create TTY services with proper dependency injection.
 * Follows the established service factory pattern used throughout the codebase.
 *
 * @param config - Configuration options for TTY services
 * @returns Complete set of TTY domain services
 */
export function createTTYServices(_config?: TTYServiceConfig): TTYServices {
  // Create TTY service (no dependencies)
  const ttyService = createTTYService();

  return {
    ttyService,
  };
}

/**
 * Default TTY service configuration.
 */
export const DEFAULT_TTY_CONFIG: TTYServiceConfig = {
  maxBufferLines: 1000,
  defaultCols: 80,
  defaultRows: 24,
  debugAnsiSequences: false,
};
