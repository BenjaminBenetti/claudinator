import { assertEquals, assertExists } from "@std/assert";
import {
  ANSI_SEQUENCE_PATTERNS,
  ANSISequenceCategory,
  ANSISequenceType,
  ANSISequurityLevel,
  BASIC_COLORS,
  createANSISequence,
  createDefaultTextAttributes,
  SGR_CODES,
} from "./ansi-sequence-model.ts";

Deno.test("ANSI Sequence Model Tests", async (t) => {
  await t.step(
    "createDefaultTextAttributes should return correct defaults",
    () => {
      const attrs = createDefaultTextAttributes();
      assertEquals(attrs.bold, false);
      assertEquals(attrs.dim, false);
      assertEquals(attrs.italic, false);
      assertEquals(attrs.underline, false);
      assertEquals(attrs.blink, false);
      assertEquals(attrs.reverse, false);
      assertEquals(attrs.strikethrough, false);
      assertEquals(attrs.foregroundColor, undefined);
      assertEquals(attrs.backgroundColor, undefined);
    },
  );

  await t.step("createANSISequence should create valid sequence", () => {
    const sequence = createANSISequence(
      "\x1b[H",
      ANSISequenceType.CSI,
      ANSISequenceCategory.Cursor,
      ANSISequurityLevel.Safe,
    );

    assertEquals(sequence.raw, "\x1b[H");
    assertEquals(sequence.type, ANSISequenceType.CSI);
    assertEquals(sequence.category, ANSISequenceCategory.Cursor);
    assertEquals(sequence.securityLevel, ANSISequurityLevel.Safe);
    assertEquals(sequence.parameters, []);
    assertEquals(sequence.isValid, true);
  });

  await t.step("ANSI_SEQUENCE_PATTERNS should match cursor movements", () => {
    // Test cursor home
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_HOME.test("\x1b[H"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_HOME.test("\x1b[A"), false);

    // Test cursor position
    assertEquals(
      ANSI_SEQUENCE_PATTERNS.CURSOR_POSITION.test("\x1b[1;1H"),
      true,
    );
    assertEquals(
      ANSI_SEQUENCE_PATTERNS.CURSOR_POSITION.test("\x1b[10;20H"),
      true,
    );
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_POSITION.test("\x1b[H"), false);

    // Test cursor movement
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_UP.test("\x1b[A"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_UP.test("\x1b[5A"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_DOWN.test("\x1b[B"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_FORWARD.test("\x1b[C"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.CURSOR_BACKWARD.test("\x1b[D"), true);
  });

  await t.step("ANSI_SEQUENCE_PATTERNS should match erase sequences", () => {
    assertEquals(ANSI_SEQUENCE_PATTERNS.ERASE_DISPLAY.test("\x1b[J"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.ERASE_DISPLAY.test("\x1b[0J"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.ERASE_DISPLAY.test("\x1b[2J"), true);

    assertEquals(ANSI_SEQUENCE_PATTERNS.ERASE_LINE.test("\x1b[K"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.ERASE_LINE.test("\x1b[0K"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.ERASE_LINE.test("\x1b[2K"), true);
  });

  await t.step("ANSI_SEQUENCE_PATTERNS should match SGR sequences", () => {
    assertEquals(ANSI_SEQUENCE_PATTERNS.SGR_SEQUENCE.test("\x1b[m"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.SGR_SEQUENCE.test("\x1b[0m"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.SGR_SEQUENCE.test("\x1b[1m"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.SGR_SEQUENCE.test("\x1b[31m"), true);
    assertEquals(ANSI_SEQUENCE_PATTERNS.SGR_SEQUENCE.test("\x1b[1;31m"), true);
    assertEquals(
      ANSI_SEQUENCE_PATTERNS.SGR_SEQUENCE.test("\x1b[0;1;31;47m"),
      true,
    );
  });

  await t.step(
    "ANSI_SEQUENCE_PATTERNS should match save/restore cursor",
    () => {
      assertEquals(ANSI_SEQUENCE_PATTERNS.SAVE_CURSOR.test("\x1b[s"), true);
      assertEquals(ANSI_SEQUENCE_PATTERNS.RESTORE_CURSOR.test("\x1b[u"), true);
      assertEquals(ANSI_SEQUENCE_PATTERNS.SAVE_CURSOR.test("\x1b[u"), false);
      assertEquals(ANSI_SEQUENCE_PATTERNS.RESTORE_CURSOR.test("\x1b[s"), false);
    },
  );

  await t.step(
    "ANSI_SEQUENCE_PATTERNS should identify dangerous OSC sequences",
    () => {
      assertEquals(ANSI_SEQUENCE_PATTERNS.OSC_SEQUENCE.test("\x1b]"), true);
      assertEquals(
        ANSI_SEQUENCE_PATTERNS.OSC_SEQUENCE.test("\x1b]0;title\x07"),
        true,
      );
      assertEquals(ANSI_SEQUENCE_PATTERNS.OSC_SEQUENCE.test("\x1b[H"), false);
    },
  );

  await t.step("BASIC_COLORS should have correct values", () => {
    assertEquals(BASIC_COLORS.BLACK, 0);
    assertEquals(BASIC_COLORS.RED, 1);
    assertEquals(BASIC_COLORS.GREEN, 2);
    assertEquals(BASIC_COLORS.YELLOW, 3);
    assertEquals(BASIC_COLORS.BLUE, 4);
    assertEquals(BASIC_COLORS.MAGENTA, 5);
    assertEquals(BASIC_COLORS.CYAN, 6);
    assertEquals(BASIC_COLORS.WHITE, 7);
  });

  await t.step("SGR_CODES should have correct values", () => {
    assertEquals(SGR_CODES.RESET, 0);
    assertEquals(SGR_CODES.BOLD, 1);
    assertEquals(SGR_CODES.DIM, 2);
    assertEquals(SGR_CODES.ITALIC, 3);
    assertEquals(SGR_CODES.UNDERLINE, 4);
    assertEquals(SGR_CODES.BLINK, 5);
    assertEquals(SGR_CODES.REVERSE, 7);
    assertEquals(SGR_CODES.STRIKETHROUGH, 9);

    assertEquals(SGR_CODES.FG_RED, 31);
    assertEquals(SGR_CODES.FG_GREEN, 32);
    assertEquals(SGR_CODES.BG_RED, 41);
    assertEquals(SGR_CODES.BG_GREEN, 42);
    assertEquals(SGR_CODES.FG_DEFAULT, 39);
    assertEquals(SGR_CODES.BG_DEFAULT, 49);
  });

  await t.step("All exports should be defined", () => {
    assertExists(ANSISequenceType);
    assertExists(ANSISequurityLevel);
    assertExists(ANSISequenceCategory);
    assertExists(ANSI_SEQUENCE_PATTERNS);
    assertExists(BASIC_COLORS);
    assertExists(SGR_CODES);
    assertExists(createANSISequence);
    assertExists(createDefaultTextAttributes);
  });
});
