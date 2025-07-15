import { assertEquals, assertExists, assertThrows } from "@std/assert";
import {
  createTTYService,
  TTYService,
  TTYServiceError,
} from "./tty-service.ts";
import { createDefaultTextAttributes } from "../models/ansi-sequence-model.ts";

Deno.test("TTY Service Tests", async (t) => {
  await t.step("createTTYService should create service instance", () => {
    const service = createTTYService();
    assertExists(service);
    assertEquals(typeof service.createTTYBuffer, "function");
    assertEquals(typeof service.processOutput, "function");
    assertEquals(typeof service.getTTYBuffer, "function");
  });

  await t.step("createTTYBuffer should create buffer and return it", () => {
    const service = new TTYService();
    const buffer = service.createTTYBuffer("test-session");

    assertEquals(buffer.sessionId, "test-session");
    assertEquals(buffer.size.cols, 80);
    assertEquals(buffer.size.rows, 24);

    // Should be retrievable
    const retrieved = service.getTTYBuffer("test-session");
    assertEquals(retrieved, buffer);
  });

  await t.step(
    "createTTYBuffer should create buffer with custom dimensions",
    () => {
      const service = new TTYService();
      const cols = 120;
      const rows = 30;
      const buffer = service.createTTYBuffer("test-session", cols, rows);

      assertEquals(buffer.size.cols, 120);
      assertEquals(buffer.size.rows, 30);
    },
  );

  await t.step("createTTYBuffer should call callback on changes", () => {
    const service = new TTYService();
    let callbackCalled = false;
    let callbackSessionId = "";

    const buffer = service.createTTYBuffer(
      "test-session",
      80,
      24,
      (sessionId, _buffer) => {
        callbackCalled = true;
        callbackSessionId = sessionId;
      },
    );

    // Process some output to trigger callback
    service.processOutput("test-session", "Hello");

    assertEquals(callbackCalled, true);
    assertEquals(callbackSessionId, "test-session");
  });

  await t.step(
    "processOutput should throw error for non-existent session",
    () => {
      const service = new TTYService();

      assertThrows(
        () => service.processOutput("non-existent", "test"),
        TTYServiceError,
        "TTY buffer not found for session: non-existent",
      );
    },
  );

  await t.step("processOutput should handle normal text", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "Hello World");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "Hello World");
  });

  await t.step("processOutput should handle newlines", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "Line 1\nLine 2\nLine 3");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "Line 1");
    assertEquals(visibleLines[1], "Line 2");
    assertEquals(visibleLines[2], "Line 3");
  });

  await t.step("processOutput should handle carriage returns", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "Hello\rWorld");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "World");
  });

  await t.step("processOutput should handle tabs", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "A\tB");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0].includes("A"), true);
    assertEquals(visibleLines[0].includes("B"), true);
    // Tab should expand to next 8-character boundary
    assertEquals(visibleLines[0].length >= 9, true);
  });

  await t.step("processOutput should handle backspace", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "ABC\b\bXY");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "AXY");
  });

  await t.step("processOutput should handle cursor movement sequences", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    // Move cursor and write
    service.processOutput("test-session", "\x1b[2;5HTest");

    const buffer = service.getTTYBuffer("test-session");
    assertEquals(buffer!.cursor.row, 1); // 0-based, so row 2 becomes 1
    assertEquals(buffer!.cursor.col, 8); // After writing "Test" (0-based: start at 4, write 4 chars = 8)
  });

  await t.step("processOutput should handle screen clear", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "Line 1\nLine 2\nLine 3");
    service.processOutput("test-session", "\x1b[2J"); // Clear entire screen

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "");
    assertEquals(visibleLines[1], "");
    assertEquals(visibleLines[2], "");
  });

  await t.step("processOutput should handle SGR color sequences", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "\x1b[31mRed Text\x1b[0m");

    const buffer = service.getTTYBuffer("test-session");
    // After reset, color should be default
    assertEquals(buffer!.currentAttributes.foregroundColor, undefined);
  });

  await t.step("processOutput should handle SGR formatting sequences", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput(
      "test-session",
      "\x1b[1mBold\x1b[22m\x1b[4mUnderline\x1b[24m",
    );

    const buffer = service.getTTYBuffer("test-session");
    assertEquals(buffer!.currentAttributes.bold, false);
    assertEquals(buffer!.currentAttributes.underline, false);
  });

  await t.step("processOutput should filter dangerous OSC sequences", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    // OSC sequences should be filtered
    service.processOutput("test-session", "Before\x1b]0;title\x07After");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "BeforeAfter");
  });

  await t.step(
    "getVisibleLines should throw error for non-existent session",
    () => {
      const service = new TTYService();

      assertThrows(
        () => service.getVisibleLines("non-existent"),
        TTYServiceError,
        "TTY buffer not found for session: non-existent",
      );
    },
  );

  await t.step(
    "getVisibleLines should return empty lines for empty buffer",
    () => {
      const service = new TTYService();
      const cols = 80;
      const rows = 5;
      service.createTTYBuffer("test-session", cols, rows);

      const visibleLines = service.getVisibleLines("test-session");
      assertEquals(visibleLines.length, 5);
      assertEquals(visibleLines[0], "");
      assertEquals(visibleLines[4], "");
    },
  );

  await t.step("resizeTerminal should update buffer dimensions", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session", 80, 24);

    service.resizeTerminal("test-session", 120, 30);

    const buffer = service.getTTYBuffer("test-session");
    assertEquals(buffer!.size.cols, 120);
    assertEquals(buffer!.size.rows, 30);
  });

  await t.step(
    "resizeTerminal should adjust cursor position if outside bounds",
    () => {
      const service = new TTYService();
      service.createTTYBuffer("test-session", 80, 24);

      // Move cursor to edge
      service.processOutput("test-session", "\x1b[24;80H");

      // Resize smaller
      service.resizeTerminal("test-session", 40, 12);

      const buffer = service.getTTYBuffer("test-session");
      assertEquals(buffer!.cursor.col <= 39, true); // Should be within bounds
      assertEquals(buffer!.cursor.row <= 11, true); // Should be within bounds
    },
  );

  await t.step("clearBuffer should clear screen", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    service.processOutput("test-session", "Line 1\nLine 2\nLine 3");
    service.clearBuffer("test-session");

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "");
    assertEquals(visibleLines[1], "");
    assertEquals(visibleLines[2], "");
  });

  await t.step("removeTTYBuffer should clean up session", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    // Buffer should exist after creation
    assertExists(service.getTTYBuffer("test-session"));

    service.removeTTYBuffer("test-session");

    // Buffer should be undefined after removal
    assertEquals(service.getTTYBuffer("test-session"), undefined);
  });

  await t.step("processOutput should handle line wrapping", () => {
    const service = new TTYService();
    const cols = 10;
    const rows = 5;
    service.createTTYBuffer("test-session", cols, rows); // Small terminal

    // Long line that should wrap
    service.processOutput(
      "test-session",
      "This is a very long line that exceeds terminal width",
    );

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines.some((line) => line.length > 0), true);
  });

  await t.step(
    "processOutput should handle multiple cursor save/restore",
    () => {
      const service = new TTYService();
      service.createTTYBuffer("test-session");

      // Move cursor and save
      service.processOutput("test-session", "\x1b[5;10H\x1b[s");

      // Move cursor elsewhere
      service.processOutput("test-session", "\x1b[1;1H");

      // Restore cursor
      service.processOutput("test-session", "\x1b[u");

      const buffer = service.getTTYBuffer("test-session");
      assertEquals(buffer!.cursor.row, 4); // 0-based
      assertEquals(buffer!.cursor.col, 9); // 0-based
    },
  );

  await t.step("processOutput should handle complex ANSI sequences", () => {
    const service = new TTYService();
    service.createTTYBuffer("test-session");

    // Complex sequence: clear screen, move cursor, set colors, write text
    service.processOutput(
      "test-session",
      "\x1b[2J\x1b[1;1H\x1b[31;42mRed on Green\x1b[0m",
    );

    const visibleLines = service.getVisibleLines("test-session");
    assertEquals(visibleLines[0], "Red on Green");

    const buffer = service.getTTYBuffer("test-session");
    assertEquals(buffer!.currentAttributes.foregroundColor, undefined);
  });
});
