import { assertEquals, assertExists, assertNotEquals } from "@std/assert";
import {
  BUFFER_LIMITS,
  createCursorPosition,
  createScreenBuffer,
  createTerminalCharacter,
  createTerminalLine,
  createTTYBuffer,
  DEFAULT_TTY_SIZE,
} from "./tty-buffer-model.ts";
import { createDefaultTextAttributes } from "./ansi-sequence-model.ts";

Deno.test("TTY Buffer Model Tests", async (t) => {
  await t.step(
    "createTerminalCharacter should create character with attributes",
    () => {
      const attributes = createDefaultTextAttributes();
      attributes.bold = true;
      attributes.foregroundColor = 1; // red

      const char = createTerminalCharacter("A", attributes);
      assertEquals(char.char, "A");
      assertEquals(char.width, 1);
      assertEquals(char.attributes.bold, true);
      assertEquals(char.attributes.foregroundColor, 1);

      // Should be a copy, not reference
      attributes.bold = false;
      assertEquals(char.attributes.bold, true);
    },
  );

  await t.step("createTerminalCharacter should handle wide characters", () => {
    const attributes = createDefaultTextAttributes();
    const char = createTerminalCharacter("漢", attributes, 2);
    assertEquals(char.char, "漢");
    assertEquals(char.width, 2);
  });

  await t.step("createTerminalLine should create line with defaults", () => {
    const line = createTerminalLine();
    assertEquals(line.characters, []);
    assertEquals(line.isWrapped, false);
    assertExists(line.timestamp);
  });

  await t.step("createTerminalLine should create line with characters", () => {
    const char1 = createTerminalCharacter("H", createDefaultTextAttributes());
    const char2 = createTerminalCharacter("i", createDefaultTextAttributes());

    const line = createTerminalLine([char1, char2], true);
    assertEquals(line.characters.length, 2);
    assertEquals(line.characters[0].char, "H");
    assertEquals(line.characters[1].char, "i");
    assertEquals(line.isWrapped, true);
  });

  await t.step(
    "createCursorPosition should create cursor with defaults",
    () => {
      const cursor = createCursorPosition();
      assertEquals(cursor.col, 0);
      assertEquals(cursor.row, 0);
      assertEquals(cursor.visible, true);
    },
  );

  await t.step("createCursorPosition should create cursor with values", () => {
    const cursor = createCursorPosition(10, 5, false);
    assertEquals(cursor.col, 10);
    assertEquals(cursor.row, 5);
    assertEquals(cursor.visible, false);
  });

  await t.step("createScreenBuffer should create buffer with defaults", () => {
    const buffer = createScreenBuffer();
    assertEquals(buffer.lines, []);
    assertEquals(buffer.maxLines, 1000);
    assertEquals(buffer.scrollTop, 0);
    assertEquals(buffer.scrolledOffLines, 0);
  });

  await t.step(
    "createScreenBuffer should create buffer with custom max lines",
    () => {
      const buffer = createScreenBuffer(500);
      assertEquals(buffer.maxLines, 500);
    },
  );

  await t.step("createTTYBuffer should create buffer with defaults", () => {
    const buffer = createTTYBuffer("test-session");
    assertEquals(buffer.sessionId, "test-session");
    assertEquals(buffer.size.cols, 80);
    assertEquals(buffer.size.rows, 24);
    assertEquals(buffer.useAlternateBuffer, false);
    assertEquals(buffer.cursor.col, 0);
    assertEquals(buffer.cursor.row, 0);
    assertEquals(buffer.savedCursor, undefined);

    // Check mode defaults
    assertEquals(buffer.modes.applicationCursor, false);
    assertEquals(buffer.modes.autowrap, true);
    assertEquals(buffer.modes.insertMode, false);
    assertEquals(buffer.modes.localEcho, true);

    // Check attributes defaults
    assertEquals(buffer.currentAttributes.bold, false);
    assertEquals(buffer.currentAttributes.foregroundColor, undefined);
    assertEquals(buffer.currentAttributes.backgroundColor, undefined);

    assertExists(buffer.lastUpdated);
    assertExists(buffer.primaryBuffer);
    assertExists(buffer.alternateBuffer);
  });

  await t.step("createTTYBuffer should create buffer with custom size", () => {
    const buffer = createTTYBuffer("test-session", 120, 30);
    assertEquals(buffer.size.cols, 120);
    assertEquals(buffer.size.rows, 30);
  });

  await t.step(
    "createTTYBuffer should create separate primary and alternate buffers",
    () => {
      const buffer = createTTYBuffer("test-session");
      // Should be different object references
      assertEquals(buffer.primaryBuffer === buffer.alternateBuffer, false);
      assertEquals(buffer.primaryBuffer.lines, []);
      assertEquals(buffer.alternateBuffer.lines, []);

      // Modifying one shouldn't affect the other
      buffer.primaryBuffer.lines.push(createTerminalLine());
      assertEquals(buffer.primaryBuffer.lines.length, 1);
      assertEquals(buffer.alternateBuffer.lines.length, 0);
    },
  );

  await t.step("DEFAULT_TTY_SIZE should have correct values", () => {
    assertEquals(DEFAULT_TTY_SIZE.COLS, 80);
    assertEquals(DEFAULT_TTY_SIZE.ROWS, 24);
  });

  await t.step("BUFFER_LIMITS should have correct values", () => {
    assertEquals(BUFFER_LIMITS.MAX_LINES, 10000);
    assertEquals(BUFFER_LIMITS.MAX_LINE_LENGTH, 4096);
    assertEquals(BUFFER_LIMITS.TRIM_TO_LINES, 1000);
  });

  await t.step("TTYBuffer should maintain timestamp on updates", async () => {
    const buffer = createTTYBuffer("test-session");
    const initialTime = buffer.lastUpdated.getTime();

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    buffer.lastUpdated = new Date();
    const updatedTime = buffer.lastUpdated.getTime();

    assertEquals(updatedTime > initialTime, true);
  });

  await t.step("All exports should be defined", () => {
    assertExists(createTerminalCharacter);
    assertExists(createTerminalLine);
    assertExists(createCursorPosition);
    assertExists(createScreenBuffer);
    assertExists(createTTYBuffer);
    assertExists(DEFAULT_TTY_SIZE);
    assertExists(BUFFER_LIMITS);
  });
});
