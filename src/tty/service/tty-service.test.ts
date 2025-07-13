/**
 * Tests for TTY service.
 */

import { assert, assertEquals, assertStrictEquals } from "@std/assert";
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
    "line1\nline2\nline3\roverwrite",
  );

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

Deno.test("TTYService - echo command simulation", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  // Simulate terminal output for: echo 'hello world'
  // Expected output: "hello world" followed by new prompt line
  const terminalOutput = "hello world\n";

  let result = service.appendOutput(buffer, terminalOutput);
  result = service.appendOutput(result.updatedBuffer, ">prompt");

  console.log("Final buffer:", result.updatedBuffer);

  assertEquals(result.updatedBuffer, ["hello world", ">prompt"]);
  assertEquals(result.wasTrimmed, false);
  assertEquals(result.linesRemoved, 0);
});

Deno.test("TTYService - realistic terminal echo with carriage returns", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  // Debug: test what happens with just carriage returns
  let result = service.appendOutput(buffer, "\r\r\r");
  console.log("After \\r\\r\\r:", result.updatedBuffer);
  
  // Then add content
  result = service.appendOutput(result.updatedBuffer, "hello world\n");
  console.log("After hello world\\n:", result.updatedBuffer);
  
  // Then add prompt
  result = service.appendOutput(result.updatedBuffer, "@user ➜ /workspace $ ");
  console.log("Final realistic terminal buffer:", result.updatedBuffer);

  // Should have minimal empty lines
  assertEquals(result.updatedBuffer.length <= 3, true); // At most: empty, content, prompt
});

Deno.test("TTYService - newline when cursor at start of line", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  // Debug: test what happens with just carriage returns
  let result = service.appendOutput(buffer, "cat");
  result = service.appendOutput(result.updatedBuffer, "\r\nhello world\n");
  result = service.appendOutput(result.updatedBuffer, "@user ➜ /workspace $ ");
    
  assertEquals(result.updatedBuffer, ["cat", "hello world", "@user ➜ /workspace $ "]);
});

Deno.test("TTYService - ANSI bracketed paste mode sequences should not create lines", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  // Simulate the exact sequence from the logs
  const result = service.appendOutput(buffer, "\u001b[?2004l\u001b[?2004h\u001b[0;32m@BenjaminBenetti \u001b[0m➜ \u001b[1;34m/workspaces/claudinator \u001b[0;36m(\u001b[1;31mmain\u001b[0;36m) \u001b[0m$ ");
  
  console.log("Buffer after ANSI sequences:", result.updatedBuffer);
  
  // Should only have the visible prompt content, not separate lines for control sequences
  assertEquals(result.updatedBuffer.length, 1);
  // The line should contain the visible prompt text (ANSI sequences can remain for coloring)
  assert(result.updatedBuffer[0].includes("@BenjaminBenetti"));
  assert(result.updatedBuffer[0].includes("claudinator"));
});

Deno.test("TTYService - ANSI control sequences as separate chunks create unwanted lines", () => {
  const service = createTTYService();
  const buffer: string[] = [];

  // Simulate the issue: control sequences arriving as separate chunks
  // This reproduces the problem where "\u001b[?2004l" comes in one chunk
  let result = service.appendOutput(buffer, "\u001b[?2004l");
  console.log("After control sequence chunk 1:", result.updatedBuffer);
  
  // Then the next control sequence comes in another chunk  
  result = service.appendOutput(result.updatedBuffer, "\u001b[?2004h");
  console.log("After control sequence chunk 2:", result.updatedBuffer);
  
  // Then the actual visible content
  result = service.appendOutput(result.updatedBuffer, "\u001b[0;32m@BenjaminBenetti \u001b[0m➜ \u001b[1;34m/workspaces/claudinator \u001b[0;36m(\u001b[1;31mmain\u001b[0;36m) \u001b[0m$ ");
  console.log("After visible content:", result.updatedBuffer);
  
  // This is the problem: we get multiple lines when we should have just one
  // The control sequences should not create separate lines
  console.log("Final buffer length:", result.updatedBuffer.length);
  console.log("Lines with only ANSI:", result.updatedBuffer.filter(line => 
    line.startsWith("\u001b[") && !line.includes("@BenjaminBenetti")
  ));
});
