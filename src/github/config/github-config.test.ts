import { assertEquals, assertThrows } from "@std/assert";
import {
  createConfigFromEnvironment,
  createGitHubConfigService,
  DEFAULT_GITHUB_CONFIG,
  GitHubConfigService,
} from "./github-config.ts";

Deno.test("GitHubConfigService - default configuration", () => {
  const service = new GitHubConfigService();
  const config = service.getConfig();

  assertEquals(config.defaultMachineType, "basicLinux32gb");
  assertEquals(config.defaultLocation, "UsEast");
  assertEquals(config.defaultIdleTimeoutMinutes, 30);
  assertEquals(config.defaultRetentionPeriodMinutes, 10080);
  assertEquals(config.requestTimeoutMs, 30000);
  assertEquals(config.maxRetryAttempts, 3);
});

Deno.test("GitHubConfigService - custom initial configuration", () => {
  const customConfig = {
    defaultMachineType: "premiumLinux",
    defaultIdleTimeoutMinutes: 60,
  };

  const service = new GitHubConfigService(customConfig);
  const config = service.getConfig();

  assertEquals(config.defaultMachineType, "premiumLinux");
  assertEquals(config.defaultIdleTimeoutMinutes, 60);
  // Other values should use defaults
  assertEquals(config.defaultLocation, "UsEast");
  assertEquals(config.requestTimeoutMs, 30000);
});

Deno.test("GitHubConfigService - updateConfig", () => {
  const service = new GitHubConfigService();

  service.updateConfig({
    defaultMachineType: "standardLinux32gb",
    defaultIdleTimeoutMinutes: 45,
  });

  const config = service.getConfig();
  assertEquals(config.defaultMachineType, "standardLinux32gb");
  assertEquals(config.defaultIdleTimeoutMinutes, 45);
  // Other values should remain unchanged
  assertEquals(config.defaultLocation, "UsEast");
});

Deno.test("GitHubConfigService - resetToDefaults", () => {
  const service = new GitHubConfigService();

  // Update config
  service.updateConfig({
    defaultMachineType: "premiumLinux",
    defaultIdleTimeoutMinutes: 60,
  });

  // Reset to defaults
  service.resetToDefaults();

  const config = service.getConfig();
  assertEquals(
    config.defaultMachineType,
    DEFAULT_GITHUB_CONFIG.defaultMachineType,
  );
  assertEquals(
    config.defaultIdleTimeoutMinutes,
    DEFAULT_GITHUB_CONFIG.defaultIdleTimeoutMinutes,
  );
});

Deno.test("GitHubConfigService - getConfig returns copy", () => {
  const service = new GitHubConfigService();

  const config1 = service.getConfig();
  const config2 = service.getConfig();

  // Should be different objects
  assertEquals(config1 !== config2, true);
  // But with same values
  assertEquals(config1.defaultMachineType, config2.defaultMachineType);
});

Deno.test("GitHubConfigService - validateConfig valid machine type", () => {
  const service = new GitHubConfigService();

  // Should not throw for valid machine types
  service.validateConfig({ defaultMachineType: "basicLinux32gb" });
  service.validateConfig({ defaultMachineType: "standardLinux" });
  service.validateConfig({ defaultMachineType: "premiumLinux" });
  service.validateConfig({ defaultMachineType: "largePremiumLinux" });
});

Deno.test("GitHubConfigService - validateConfig invalid machine type", () => {
  const service = new GitHubConfigService();

  assertThrows(
    () => service.validateConfig({ defaultMachineType: "invalid-machine" }),
    Error,
    "Invalid machine type: invalid-machine",
  );
});

Deno.test("GitHubConfigService - validateConfig valid location", () => {
  const service = new GitHubConfigService();

  service.validateConfig({ defaultLocation: "EuropeWest" });
  service.validateConfig({ defaultLocation: "SoutheastAsia" });
  service.validateConfig({ defaultLocation: "UsEast" });
  service.validateConfig({ defaultLocation: "UsWest" });
});

Deno.test("GitHubConfigService - validateConfig invalid location", () => {
  const service = new GitHubConfigService();

  assertThrows(
    () => service.validateConfig({ defaultLocation: "InvalidLocation" }),
    Error,
    "Invalid location: InvalidLocation",
  );
});

Deno.test("GitHubConfigService - validateConfig idle timeout bounds", () => {
  const service = new GitHubConfigService();

  // Valid values
  service.validateConfig({ defaultIdleTimeoutMinutes: 5 });
  service.validateConfig({ defaultIdleTimeoutMinutes: 240 });
  service.validateConfig({ defaultIdleTimeoutMinutes: 30 });

  // Invalid values
  assertThrows(
    () => service.validateConfig({ defaultIdleTimeoutMinutes: 4 }),
    Error,
    "Idle timeout must be between 5 and 240 minutes",
  );

  assertThrows(
    () => service.validateConfig({ defaultIdleTimeoutMinutes: 241 }),
    Error,
    "Idle timeout must be between 5 and 240 minutes",
  );
});

Deno.test("GitHubConfigService - validateConfig retention period bounds", () => {
  const service = new GitHubConfigService();

  // Valid values
  service.validateConfig({ defaultRetentionPeriodMinutes: 60 });
  service.validateConfig({ defaultRetentionPeriodMinutes: 43200 });

  // Invalid values
  assertThrows(
    () => service.validateConfig({ defaultRetentionPeriodMinutes: 59 }),
    Error,
    "Retention period must be between 1 hour and 30 days",
  );

  assertThrows(
    () => service.validateConfig({ defaultRetentionPeriodMinutes: 43201 }),
    Error,
    "Retention period must be between 1 hour and 30 days",
  );
});

Deno.test("GitHubConfigService - validateConfig request timeout bounds", () => {
  const service = new GitHubConfigService();

  // Valid values
  service.validateConfig({ requestTimeoutMs: 5000 });
  service.validateConfig({ requestTimeoutMs: 300000 });

  // Invalid values
  assertThrows(
    () => service.validateConfig({ requestTimeoutMs: 4999 }),
    Error,
    "Request timeout must be between 5 and 300 seconds",
  );

  assertThrows(
    () => service.validateConfig({ requestTimeoutMs: 300001 }),
    Error,
    "Request timeout must be between 5 and 300 seconds",
  );
});

Deno.test("GitHubConfigService - validateConfig max retry attempts bounds", () => {
  const service = new GitHubConfigService();

  // Valid values
  service.validateConfig({ maxRetryAttempts: 0 });
  service.validateConfig({ maxRetryAttempts: 10 });

  // Invalid values
  assertThrows(
    () => service.validateConfig({ maxRetryAttempts: -1 }),
    Error,
    "Max retry attempts must be between 0 and 10",
  );

  assertThrows(
    () => service.validateConfig({ maxRetryAttempts: 11 }),
    Error,
    "Max retry attempts must be between 0 and 10",
  );
});

Deno.test("GitHubConfigService - validateConfig retry delay relationship", () => {
  const service = new GitHubConfigService();

  // Valid relationship
  service.validateConfig({
    baseRetryDelayMs: 1000,
    maxRetryDelayMs: 5000,
  });

  // Invalid relationship
  assertThrows(
    () =>
      service.validateConfig({
        baseRetryDelayMs: 5000,
        maxRetryDelayMs: 1000,
      }),
    Error,
    "Max retry delay must be greater than base retry delay",
  );

  assertThrows(
    () =>
      service.validateConfig({
        baseRetryDelayMs: 5000,
        maxRetryDelayMs: 5000,
      }),
    Error,
    "Max retry delay must be greater than base retry delay",
  );
});

Deno.test("GitHubConfigService - updateConfig validates new config", () => {
  const service = new GitHubConfigService();

  assertThrows(
    () => service.updateConfig({ defaultMachineType: "invalid" }),
    Error,
    "Invalid machine type: invalid",
  );
});

Deno.test("createGitHubConfigService factory function", () => {
  const service = createGitHubConfigService();
  assertEquals(service instanceof GitHubConfigService, true);

  const customService = createGitHubConfigService({
    defaultMachineType: "premiumLinux",
  });
  assertEquals(customService.getConfig().defaultMachineType, "premiumLinux");
});

Deno.test("createConfigFromEnvironment - no environment variables", () => {
  // Clear environment variables for this test
  const originalVars = new Map();
  const envVars = [
    "GITHUB_DEFAULT_MACHINE_TYPE",
    "GITHUB_DEFAULT_LOCATION",
    "GITHUB_DEFAULT_IDLE_TIMEOUT_MINUTES",
    "GITHUB_DEFAULT_RETENTION_PERIOD_MINUTES",
    "GITHUB_REQUEST_TIMEOUT_MS",
    "GITHUB_MAX_RETRY_ATTEMPTS",
  ];

  envVars.forEach((varName) => {
    originalVars.set(varName, Deno.env.get(varName));
    Deno.env.delete(varName);
  });

  try {
    const config = createConfigFromEnvironment();
    assertEquals(config, {});
  } finally {
    // Restore original environment variables
    originalVars.forEach((value, key) => {
      if (value !== undefined) {
        Deno.env.set(key, value);
      }
    });
  }
});

Deno.test("createConfigFromEnvironment - with environment variables", () => {
  // Set environment variables for this test
  const envVars = {
    "GITHUB_DEFAULT_MACHINE_TYPE": "premiumLinux",
    "GITHUB_DEFAULT_LOCATION": "EuropeWest",
    "GITHUB_DEFAULT_IDLE_TIMEOUT_MINUTES": "60",
    "GITHUB_DEFAULT_RETENTION_PERIOD_MINUTES": "14400",
    "GITHUB_REQUEST_TIMEOUT_MS": "45000",
    "GITHUB_MAX_RETRY_ATTEMPTS": "5",
  };

  const originalVars = new Map();

  // Store original values and set test values
  Object.entries(envVars).forEach(([key, value]) => {
    originalVars.set(key, Deno.env.get(key));
    Deno.env.set(key, value);
  });

  try {
    const config = createConfigFromEnvironment();

    assertEquals(config.defaultMachineType, "premiumLinux");
    assertEquals(config.defaultLocation, "EuropeWest");
    assertEquals(config.defaultIdleTimeoutMinutes, 60);
    assertEquals(config.defaultRetentionPeriodMinutes, 14400);
    assertEquals(config.requestTimeoutMs, 45000);
    assertEquals(config.maxRetryAttempts, 5);
  } finally {
    // Restore original environment variables
    originalVars.forEach((value, key) => {
      if (value !== undefined) {
        Deno.env.set(key, value);
      } else {
        Deno.env.delete(key);
      }
    });
  }
});

Deno.test("createConfigFromEnvironment - invalid numeric values ignored", () => {
  const envVars = {
    "GITHUB_DEFAULT_IDLE_TIMEOUT_MINUTES": "not-a-number",
    "GITHUB_MAX_RETRY_ATTEMPTS": "invalid",
  };

  const originalVars = new Map();

  Object.entries(envVars).forEach(([key, value]) => {
    originalVars.set(key, Deno.env.get(key));
    Deno.env.set(key, value);
  });

  try {
    const config = createConfigFromEnvironment();

    // Invalid numeric values should be ignored
    assertEquals(config.defaultIdleTimeoutMinutes, undefined);
    assertEquals(config.maxRetryAttempts, undefined);
  } finally {
    originalVars.forEach((value, key) => {
      if (value !== undefined) {
        Deno.env.set(key, value);
      } else {
        Deno.env.delete(key);
      }
    });
  }
});
