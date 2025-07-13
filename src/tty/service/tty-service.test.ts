/**
 * Tests for TTY service.
 */

import { assertEquals, assertStrictEquals } from "@std/assert";
import { createTTYService, TTYService } from "./tty-service.ts";
import { DEFAULT_TTY_BUFFER_CONFIG } from "../models/tty-buffer-model.ts";

Deno.test("TTYService - factory function creates instance", () => {
  const service = createTTYService();
  assertStrictEquals(service instanceof TTYService, true);
});

Deno.test("TTYService - createBufferState creates default state", () => {
  const service = createTTYService();
  const state = service.createBufferState();

  assertEquals(state.buffer, []);
  assertEquals(state.config, DEFAULT_TTY_BUFFER_CONFIG);
});

Deno.test("TTYService - createBufferState with custom config", () => {
  const service = createTTYService();
  const customConfig = { maxBufferLines: 500 };
  const state = service.createBufferState(customConfig);

  assertEquals(state.buffer, []);
  assertEquals(state.config.maxBufferLines, 500);
  assertEquals(state.config.handleCarriageReturn, true); // default preserved
});

Deno.test("TTYService - appendOutput with Unix line endings", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  const result = service.appendOutput(buffer, "line1\nline2\nline3");

  assertEquals(result.updatedBuffer, ["line1", "line2", "line3"]);
  assertEquals(result.wasTrimmed, false);
  assertEquals(result.linesRemoved, 0);
});

Deno.test("TTYService - appendOutput with Windows line endings", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  const result = service.appendOutput(buffer, "line1\r\nline2\r\n");

  assertEquals(result.updatedBuffer, ["line1", "line2"]);
  assertEquals(result.wasTrimmed, false);
});

Deno.test("TTYService - appendOutput with carriage return (overwrite)", () => {
  const service = createTTYService();
  const buffer = ["existing line"];

  const result = service.appendOutput(buffer, "\roverwritten");

  assertEquals(result.updatedBuffer, ["overwritten"]);
  assertEquals(result.wasTrimmed, false);
});

Deno.test("TTYService - appendOutput to existing buffer", () => {
  const service = createTTYService();
  const buffer = ["line1", "partial"];

  const result = service.appendOutput(buffer, " continuation\nline3");

  assertEquals(result.updatedBuffer, [
    "line1",
    "partial continuation",
    "line3",
  ]);
});

Deno.test("TTYService - appendOutput with mixed line endings", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  const result = service.appendOutput(
    buffer,
    "line1\r\nline2\nline3\roverwrite",
  );

  console.log(result.updatedBuffer);
  assertEquals(result.updatedBuffer, ["line1", "line2", "overwrite"]);
});

Deno.test("TTYService - appendOutput trims buffer when exceeding max lines", () => {
  const service = createTTYService();
  const buffer = ["line1", "line2", "line3"];
  const config = { ...DEFAULT_TTY_BUFFER_CONFIG, maxBufferLines: 3 };

  const result = service.appendOutput(buffer, "line4\nline5", config);

  assertEquals(result.updatedBuffer, ["line3", "line4", "line5"]);
  assertEquals(result.wasTrimmed, true);
  assertEquals(result.linesRemoved, 2);
});

Deno.test("TTYService - appendOutput with empty text", () => {
  const service = createTTYService();
  const buffer = ["existing"];

  const result = service.appendOutput(buffer, "");

  assertEquals(result.updatedBuffer, ["existing"]);
  assertEquals(result.wasTrimmed, false);
});

Deno.test("TTYService - appendOutput with only line endings", () => {
  const service = createTTYService();
  const buffer = ["line1"];

  const result = service.appendOutput(buffer, "\n\n");

  assertEquals(result.updatedBuffer, ["line1", "", ""]);
});

Deno.test("TTYService - appendOutput with remainder text", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  const result = service.appendOutput(buffer, "line1\npartial");

  assertEquals(result.updatedBuffer, ["line1", "partial"]);
});

Deno.test("TTYService - complex carriage return scenario", () => {
  const service = createTTYService();
  const buffer = ["Status: Starting"];

  // Simulate progress updates with carriage returns
  let result = service.appendOutput(buffer, "\rStatus: Loading...");
  assertEquals(result.updatedBuffer, ["Status: Loading..."]);

  result = service.appendOutput(result.updatedBuffer, "\rStatus: Complete");
  assertEquals(result.updatedBuffer, ["Status: Complete"]);
});

Deno.test("TTYService - multiple consecutive carriage returns", () => {
  const service = createTTYService();
  const buffer = ["original"];

  const result = service.appendOutput(buffer, "\rfirst\rsecond\rthird");

  assertEquals(result.updatedBuffer, ["third"]);
});

Deno.test("TTYService - carriage return on empty buffer", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  const result = service.appendOutput(buffer, "\roverwrite");

  assertEquals(result.updatedBuffer, ["overwrite"]);
});

Deno.test("TTYService - handles very long line", () => {
  const service = createTTYService();
  const buffer: string[] = [];
  const longLine = "a".repeat(10000);

  const result = service.appendOutput(buffer, longLine);

  assertEquals(result.updatedBuffer, [longLine]);
});

Deno.test("TTYService - stress test with many lines", () => {
  const service = createTTYService();
  const buffer: string[] = [];
  const manyLines = Array.from({ length: 2000 }, (_, i) => `line${i}`).join(
    "\n",
  );
  const config = { ...DEFAULT_TTY_BUFFER_CONFIG, maxBufferLines: 1000 };

  const result = service.appendOutput(buffer, manyLines, config);

  assertEquals(result.updatedBuffer.length, 1000);
  assertEquals(result.wasTrimmed, true);
  assertEquals(result.linesRemoved, 1000);
  assertEquals(result.updatedBuffer[0], "line1000");
  assertEquals(result.updatedBuffer[999], "line1999");
});
