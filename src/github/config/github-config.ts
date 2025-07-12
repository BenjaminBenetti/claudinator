export interface GitHubConfig {
  // Default machine type for new codespaces
  defaultMachineType: string;

  // Default location for new codespaces
  defaultLocation: string;

  // Default idle timeout in minutes
  defaultIdleTimeoutMinutes: number;

  // Default retention period in minutes
  defaultRetentionPeriodMinutes: number;

  // Request timeout in milliseconds
  requestTimeoutMs: number;

  // Maximum retry attempts for API calls
  maxRetryAttempts: number;

  // Base retry delay in milliseconds
  baseRetryDelayMs: number;

  // Maximum retry delay in milliseconds
  maxRetryDelayMs: number;
}

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  defaultMachineType: "basicLinux32gb",
  defaultLocation: "UsEast",
  defaultIdleTimeoutMinutes: 30,
  defaultRetentionPeriodMinutes: 10080, // 7 days
  requestTimeoutMs: 30000, // 30 seconds
  maxRetryAttempts: 3,
  baseRetryDelayMs: 1000, // 1 second
  maxRetryDelayMs: 30000, // 30 seconds
};

export interface IGitHubConfigService {
  getConfig(): GitHubConfig;
  updateConfig(updates: Partial<GitHubConfig>): void;
  resetToDefaults(): void;
  validateConfig(config: Partial<GitHubConfig>): void;
}

export class GitHubConfigService implements IGitHubConfigService {
  private config: GitHubConfig;

  constructor(initialConfig?: Partial<GitHubConfig>) {
    this.config = { ...DEFAULT_GITHUB_CONFIG, ...initialConfig };
    this.validateConfig(this.config);
  }

  /**
   * Gets the current configuration
   * @returns The current GitHub configuration
   */
  getConfig(): GitHubConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration with new values
   * @param updates Partial configuration updates
   */
  updateConfig(updates: Partial<GitHubConfig>): void {
    const newConfig = { ...this.config, ...updates };
    this.validateConfig(newConfig);
    this.config = newConfig;
  }

  /**
   * Resets configuration to default values
   */
  resetToDefaults(): void {
    this.config = { ...DEFAULT_GITHUB_CONFIG };
  }

  /**
   * Validates configuration values
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  validateConfig(config: Partial<GitHubConfig>): void {
    if (config.defaultMachineType !== undefined) {
      const validMachineTypes = [
        "basicLinux32gb",
        "standardLinux",
        "standardLinux32gb",
        "premiumLinux",
        "largePremiumLinux",
      ];
      if (!validMachineTypes.includes(config.defaultMachineType)) {
        throw new Error(`Invalid machine type: ${config.defaultMachineType}`);
      }
    }

    if (config.defaultLocation !== undefined) {
      const validLocations = [
        "EuropeWest",
        "SoutheastAsia",
        "UsEast",
        "UsWest",
      ];
      if (!validLocations.includes(config.defaultLocation)) {
        throw new Error(`Invalid location: ${config.defaultLocation}`);
      }
    }

    if (config.defaultIdleTimeoutMinutes !== undefined) {
      if (
        config.defaultIdleTimeoutMinutes < 5 ||
        config.defaultIdleTimeoutMinutes > 240
      ) {
        throw new Error("Idle timeout must be between 5 and 240 minutes");
      }
    }

    if (config.defaultRetentionPeriodMinutes !== undefined) {
      if (
        config.defaultRetentionPeriodMinutes < 60 ||
        config.defaultRetentionPeriodMinutes > 43200
      ) {
        throw new Error("Retention period must be between 1 hour and 30 days");
      }
    }

    if (config.requestTimeoutMs !== undefined) {
      if (config.requestTimeoutMs < 5000 || config.requestTimeoutMs > 300000) {
        throw new Error("Request timeout must be between 5 and 300 seconds");
      }
    }

    if (config.maxRetryAttempts !== undefined) {
      if (config.maxRetryAttempts < 0 || config.maxRetryAttempts > 10) {
        throw new Error("Max retry attempts must be between 0 and 10");
      }
    }

    if (config.baseRetryDelayMs !== undefined) {
      if (config.baseRetryDelayMs < 100 || config.baseRetryDelayMs > 10000) {
        throw new Error(
          "Base retry delay must be between 100ms and 10 seconds",
        );
      }
    }

    if (config.maxRetryDelayMs !== undefined) {
      if (config.maxRetryDelayMs < 1000 || config.maxRetryDelayMs > 60000) {
        throw new Error("Max retry delay must be between 1 and 60 seconds");
      }
    }

    // Ensure max retry delay is greater than base retry delay
    if (
      config.baseRetryDelayMs !== undefined &&
      config.maxRetryDelayMs !== undefined
    ) {
      if (config.maxRetryDelayMs <= config.baseRetryDelayMs) {
        throw new Error(
          "Max retry delay must be greater than base retry delay",
        );
      }
    }
  }
}

/**
 * Factory function to create a GitHubConfigService instance
 * @param initialConfig Optional initial configuration
 * @returns A new GitHubConfigService instance
 */
export function createGitHubConfigService(
  initialConfig?: Partial<GitHubConfig>,
): IGitHubConfigService {
  return new GitHubConfigService(initialConfig);
}

/**
 * Creates a configuration from environment variables
 * @returns Partial configuration based on environment variables
 */
export function createConfigFromEnvironment(): Partial<GitHubConfig> {
  const config: Partial<GitHubConfig> = {};

  const machineType = Deno.env.get("GITHUB_DEFAULT_MACHINE_TYPE");
  if (machineType) {
    config.defaultMachineType = machineType;
  }

  const location = Deno.env.get("GITHUB_DEFAULT_LOCATION");
  if (location) {
    config.defaultLocation = location;
  }

  const idleTimeout = Deno.env.get("GITHUB_DEFAULT_IDLE_TIMEOUT_MINUTES");
  if (idleTimeout) {
    const minutes = parseInt(idleTimeout, 10);
    if (!isNaN(minutes)) {
      config.defaultIdleTimeoutMinutes = minutes;
    }
  }

  const retentionPeriod = Deno.env.get(
    "GITHUB_DEFAULT_RETENTION_PERIOD_MINUTES",
  );
  if (retentionPeriod) {
    const minutes = parseInt(retentionPeriod, 10);
    if (!isNaN(minutes)) {
      config.defaultRetentionPeriodMinutes = minutes;
    }
  }

  const requestTimeout = Deno.env.get("GITHUB_REQUEST_TIMEOUT_MS");
  if (requestTimeout) {
    const ms = parseInt(requestTimeout, 10);
    if (!isNaN(ms)) {
      config.requestTimeoutMs = ms;
    }
  }

  const maxRetries = Deno.env.get("GITHUB_MAX_RETRY_ATTEMPTS");
  if (maxRetries) {
    const attempts = parseInt(maxRetries, 10);
    if (!isNaN(attempts)) {
      config.maxRetryAttempts = attempts;
    }
  }

  return config;
}
