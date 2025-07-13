import { assertEquals } from "@std/assert";
import { logger } from "./logger.ts";

Deno.test("Logger", async (t) => {
  await t.step("should have all logging methods", () => {
    assertEquals(typeof logger.log, "function");
    assertEquals(typeof logger.info, "function");
    assertEquals(typeof logger.warn, "function");
    assertEquals(typeof logger.error, "function");
    assertEquals(typeof logger.debug, "function");
  });

  await t.step("should write log entries to file", async () => {
    // Temporarily override the log path for testing
    const originalEnv = Deno.env.get("HOME");
    Deno.env.set("HOME", "/tmp");

    logger.log("Test log message");
    logger.info("Test info message");
    logger.warn("Test warning message");
    logger.error("Test error message");
    logger.debug("Test debug message");

    // Check if log file was created and contains our messages
    const logContent = await Deno.readTextFile("/tmp/.claudinator/log.txt");
    assertEquals(logContent.includes("INFO: Test log message"), true);
    assertEquals(logContent.includes("INFO: Test info message"), true);
    assertEquals(logContent.includes("WARN: Test warning message"), true);
    assertEquals(logContent.includes("ERROR: Test error message"), true);
    assertEquals(logContent.includes("DEBUG: Test debug message"), true);

    // Restore original environment
    if (originalEnv) {
      Deno.env.set("HOME", originalEnv);
    } else {
      Deno.env.delete("HOME");
    }

    // Clean up test log file
    try {
      await Deno.remove("/tmp/.claudinator/log.txt");
      await Deno.remove("/tmp/.claudinator");
    } catch {
      // Ignore cleanup errors
    }
  });

  await t.step("should handle multiple arguments", async () => {
    // Temporarily override the log path for testing
    const originalEnv = Deno.env.get("HOME");
    Deno.env.set("HOME", "/tmp");

    logger.log("Message with", 123, { key: "value" });

    // Check if log file contains formatted message
    const logContent = await Deno.readTextFile("/tmp/.claudinator/log.txt");
    assertEquals(logContent.includes("Message with"), true);
    assertEquals(logContent.includes("123"), true);
    assertEquals(logContent.includes("key"), true);
    assertEquals(logContent.includes("value"), true);

    // Restore original environment
    if (originalEnv) {
      Deno.env.set("HOME", originalEnv);
    } else {
      Deno.env.delete("HOME");
    }

    // Clean up test log file
    try {
      await Deno.remove("/tmp/.claudinator/log.txt");
      await Deno.remove("/tmp/.claudinator");
    } catch {
      // Ignore cleanup errors
    }
  });

  await t.step("should handle Error objects", async () => {
    // Temporarily override the log path for testing
    const originalEnv = Deno.env.get("HOME");
    Deno.env.set("HOME", "/tmp");

    const error = new Error("Test error");
    logger.error("Error occurred:", error);

    // Check if log file contains error details
    const logContent = await Deno.readTextFile("/tmp/.claudinator/log.txt");
    assertEquals(logContent.includes("Error occurred:"), true);
    assertEquals(logContent.includes("Test error"), true);
    assertEquals(logContent.includes("Error:"), true);

    // Restore original environment
    if (originalEnv) {
      Deno.env.set("HOME", originalEnv);
    } else {
      Deno.env.delete("HOME");
    }

    // Clean up test log file
    try {
      await Deno.remove("/tmp/.claudinator/log.txt");
      await Deno.remove("/tmp/.claudinator");
    } catch {
      // Ignore cleanup errors
    }
  });
});
