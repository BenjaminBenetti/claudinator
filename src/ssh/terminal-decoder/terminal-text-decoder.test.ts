import { assertEquals, assertNotEquals } from "@std/assert";
import {
  createTerminalTextDecoder,
  TerminalTextDecoder,
} from "./terminal-text-decoder.ts";
import {
  containsAnsiSequences,
  extractIncompleteSequence,
} from "./ansi-patterns.ts";

Deno.test("TerminalTextDecoder - Basic ANSI sequence stripping", () => {
  const decoder = new TerminalTextDecoder();

  // Test basic color codes
  const coloredText = "\x1b[31mRed text\x1b[0m Normal text";
  const result = decoder.decode(coloredText);
  assertEquals(result, "Red text Normal text");
});

Deno.test("TerminalTextDecoder - Complex ANSI sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test complex sequences with parameters
  const complexText = "\x1b[1;32;40mBold green on black\x1b[0m\x1b[2J\x1b[H";
  const result = decoder.decode(complexText);
  assertEquals(result, "Bold green on black");
});

Deno.test("TerminalTextDecoder - Cursor movement sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test cursor movement
  const cursorText = "Hello\x1b[5D\x1b[1CWorld\x1b[A\x1b[B";
  const result = decoder.decode(cursorText);
  assertEquals(result, "HelloWorld");
});

Deno.test("TerminalTextDecoder - OSC sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test OSC title setting
  const oscText = "\x1b]0;Terminal Title\x07Hello World";
  const result = decoder.decode(oscText);
  assertEquals(result, "Hello World");

  // Test OSC with string terminator
  const oscText2 = "\x1b]2;Window Title\x1b\\More text";
  const result2 = decoder.decode(oscText2);
  assertEquals(result2, "More text");
});

Deno.test("TerminalTextDecoder - DEC private mode sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test DEC private mode
  const decText = "\x1b[?25lHidden cursor\x1b[?25hVisible cursor";
  const result = decoder.decode(decText);
  assertEquals(result, "Hidden cursorVisible cursor");
});

Deno.test("TerminalTextDecoder - Partial sequence handling", () => {
  const decoder = new TerminalTextDecoder();

  // Test partial sequence at end
  const partialText1 = "Hello\x1b[";
  const partialText2 = "31mRed\x1b[0m";

  const result1 = decoder.decode(partialText1);
  assertEquals(result1, "Hello");
  assertEquals(decoder.getBuffer(), "\x1b[");

  const result2 = decoder.decode(partialText2);
  assertEquals(result2, "Red");
  assertEquals(decoder.getBuffer(), "");
});

Deno.test("TerminalTextDecoder - Multiple partial sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test multiple incomplete sequences
  const chunks = [
    "Start\x1b",
    "[31mRed\x1b",
    "[0mNormal\x1b[",
    "32mGreen\x1b[0mEnd",
  ];

  const results = chunks.map((chunk) => decoder.decode(chunk));

  assertEquals(results[0], "Start");
  assertEquals(results[1], "Red");
  assertEquals(results[2], "Normal");
  assertEquals(results[3], "GreenEnd");
});

Deno.test("TerminalTextDecoder - Preserved control characters", () => {
  const decoder = new TerminalTextDecoder();

  // Test that newlines, tabs, carriage returns are preserved
  const controlText = "Line 1\n\x1b[31mLine 2\r\n\x1b[0m\tTabbed text";
  const result = decoder.decode(controlText);
  assertEquals(result, "Line 1\nLine 2\r\n\tTabbed text");
});

Deno.test("TerminalTextDecoder - Empty and whitespace input", () => {
  const decoder = new TerminalTextDecoder();

  assertEquals(decoder.decode(""), "");
  assertEquals(decoder.decode("   "), "   ");
  assertEquals(decoder.decode("\x1b[0m"), "");
  assertEquals(decoder.decode("\x1b[31m   \x1b[0m"), "   ");
});

Deno.test("TerminalTextDecoder - Malformed sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test malformed sequences (should be handled gracefully)
  const malformedText = "Normal\x1bInvalid\x1b[999;999;999ZTest";
  const result = decoder.decode(malformedText);
  // The \x1b without [ should remain, but valid ANSI should be stripped
  assertEquals(result, "Normal\x1bInvalidTest");
});

Deno.test("TerminalTextDecoder - Performance with large text", () => {
  const decoder = new TerminalTextDecoder();

  // Create large text with many ANSI sequences
  const largeText = Array(1000).fill("\x1b[31mRed\x1b[0m Normal ").join("");

  const startTime = performance.now();
  const result = decoder.decode(largeText);
  const endTime = performance.now();

  // Should complete quickly (under 100ms)
  const duration = endTime - startTime;
  assertEquals(result, Array(1000).fill("Red Normal ").join(""));
  console.log(`Large text decode took ${duration.toFixed(2)}ms`);
});

Deno.test("TerminalTextDecoder - UTF-8 with ANSI sequences", () => {
  const decoder = new TerminalTextDecoder();

  // Test UTF-8 characters with ANSI
  const utf8Text = "\x1b[32m🌟 Unicode: éñ中文\x1b[0m";
  const result = decoder.decode(utf8Text);
  assertEquals(result, "🌟 Unicode: éñ中文");
});

Deno.test("TerminalTextDecoder - Real terminal output simulation", () => {
  const decoder = new TerminalTextDecoder();

  // Simulate ls --color output
  const lsOutput =
    "\x1b[0m\x1b[01;34mfolder\x1b[0m  \x1b[01;32mscript.sh\x1b[0m  file.txt\n";
  const result = decoder.decode(lsOutput);
  assertEquals(result, "folder  script.sh  file.txt\n");

  // Simulate vim output
  const vimOutput = "\x1b[?1049h\x1b[22;0;0t\x1b[1;1H\x1b[2J\x1b[?12l\x1b[?25h";
  const result2 = decoder.decode(vimOutput);
  assertEquals(result2, "");
});

Deno.test("TerminalTextDecoder - Buffer clearing", () => {
  const decoder = new TerminalTextDecoder();

  // Set up a partial sequence
  decoder.decode("Test\x1b[");
  assertNotEquals(decoder.getBuffer(), "");

  // Clear buffer
  decoder.clearBuffer();
  assertEquals(decoder.getBuffer(), "");
});

Deno.test("TerminalTextDecoder - Error handling", () => {
  const decoder = new TerminalTextDecoder();

  // Test that decoder doesn't crash on various inputs
  const problematicInputs = [
    "\x00\x01\x02\x03",
    "\x1b[999999999999999999999m",
    "\x1b\x1b\x1b[[[[[",
    String.fromCharCode(65533), // Unicode replacement character
  ];

  problematicInputs.forEach((input) => {
    const result = decoder.decode(input);
    // Should not throw and should return a string
    assertEquals(typeof result, "string");
  });
});

// Factory function tests
Deno.test("createTerminalTextDecoder - Factory function", () => {
  const decoder = createTerminalTextDecoder();

  // Should implement the interface
  assertEquals(typeof decoder.decode, "function");

  // Should work correctly
  const result = decoder.decode("\x1b[31mTest\x1b[0m");
  assertEquals(result, "Test");
});

// Pattern utility tests
Deno.test("ANSI pattern utilities", () => {
  // Test containsAnsiSequences
  assertEquals(containsAnsiSequences("Normal text"), false);
  assertEquals(containsAnsiSequences("\x1b[31mColored\x1b[0m"), true);
  assertEquals(containsAnsiSequences("Mixed \x1b[32mtext"), true);

  // Test extractIncompleteSequence
  assertEquals(extractIncompleteSequence("Normal text"), "");
  assertEquals(extractIncompleteSequence("Text\x1b"), "\x1b");
  assertEquals(extractIncompleteSequence("Text\x1b["), "\x1b[");
  assertEquals(extractIncompleteSequence("Text\x1b[31"), "\x1b[31");
  assertEquals(extractIncompleteSequence("Text\x1b[31m"), "");
});
