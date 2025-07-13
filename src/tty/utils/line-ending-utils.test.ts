/**
 * Tests for line ending utilities.
 */

import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  countLines,
  hasLineEndings,
  normalizeLineEndings,
  parseLineEndings,
  splitOnLineEndings,
} from "./line-ending-utils.ts";
import { LineEndingType } from "../models/tty-line-ending-model.ts";

Deno.test("parseLineEndings - handles Unix line endings", () => {
  const text = "line1\nline2\nline3";
  const result = parseLineEndings(text);

  assertEquals(result.lines.length, 2);
  assertEquals(result.lines[0].content, "line1");
  assertEquals(result.lines[0].endingType, LineEndingType.LF);
  assertEquals(result.lines[0].shouldOverwrite, false);
  assertEquals(result.lines[1].content, "line2");
  assertEquals(result.lines[1].endingType, LineEndingType.LF);
  assertEquals(result.remainder, "line3");
});

Deno.test("parseLineEndings - handles Windows line endings", () => {
  const text = "line1\r\nline2\r\n";
  const result = parseLineEndings(text);

  assertEquals(result.lines.length, 2);
  assertEquals(result.lines[0].content, "line1");
  assertEquals(result.lines[0].endingType, LineEndingType.CRLF);
  assertEquals(result.lines[1].content, "line2");
  assertEquals(result.lines[1].endingType, LineEndingType.CRLF);
  assertEquals(result.remainder, "");
});

Deno.test("parseLineEndings - handles carriage return (overwrite behavior)", () => {
  const text = "line1\roverwrite";
  const result = parseLineEndings(text);

  assertEquals(result.lines.length, 1);
  assertEquals(result.lines[0].content, "line1");
  assertEquals(result.lines[0].endingType, LineEndingType.CR);
  assertEquals(result.lines[0].shouldOverwrite, true);
  assertEquals(result.remainder, "overwrite");
});

Deno.test("parseLineEndings - handles mixed line endings", () => {
  const text = "line1\r\nline2\nline3\rfinal";
  const result = parseLineEndings(text);

  assertEquals(result.lines.length, 3);
  assertEquals(result.lines[0].content, "line1");
  assertEquals(result.lines[0].endingType, LineEndingType.CRLF);
  assertEquals(result.lines[1].content, "line2");
  assertEquals(result.lines[1].endingType, LineEndingType.LF);
  assertEquals(result.lines[2].content, "line3");
  assertEquals(result.lines[2].endingType, LineEndingType.CR);
  assertEquals(result.lines[2].shouldOverwrite, true);
  assertEquals(result.remainder, "final");
});

Deno.test("parseLineEndings - handles empty text", () => {
  const result = parseLineEndings("");

  assertEquals(result.lines.length, 0);
  assertEquals(result.remainder, "");
});

Deno.test("parseLineEndings - handles text with no line endings", () => {
  const text = "single line no endings";
  const result = parseLineEndings(text);

  assertEquals(result.lines.length, 0);
  assertEquals(result.remainder, "single line no endings");
});

Deno.test("splitOnLineEndings - includes remainder as final line", () => {
  const text = "line1\nline2\npartial";
  const lines = splitOnLineEndings(text);

  assertEquals(lines.length, 3);
  assertEquals(lines[0].content, "line1");
  assertEquals(lines[1].content, "line2");
  assertEquals(lines[2].content, "partial");
  assertEquals(lines[2].endingType, null);
});

Deno.test("normalizeLineEndings - converts to Unix", () => {
  const text = "line1\r\nline2\rline3\n";
  const normalized = normalizeLineEndings(text, LineEndingType.LF);

  assertEquals(normalized, "line1\nline2\nline3\n");
});

Deno.test("normalizeLineEndings - converts to Windows", () => {
  const text = "line1\nline2\rline3";
  const normalized = normalizeLineEndings(text, LineEndingType.CRLF);

  assertEquals(normalized, "line1\r\nline2\r\nline3");
});

Deno.test("normalizeLineEndings - converts to carriage return", () => {
  const text = "line1\r\nline2\nline3";
  const normalized = normalizeLineEndings(text, LineEndingType.CR);

  assertEquals(normalized, "line1\rline2\rline3");
});

Deno.test("hasLineEndings - detects line endings", () => {
  assertEquals(hasLineEndings("line1\nline2"), true);
  assertEquals(hasLineEndings("line1\r\nline2"), true);
  assertEquals(hasLineEndings("line1\rline2"), true);
  assertEquals(hasLineEndings("no endings here"), false);
  assertEquals(hasLineEndings(""), false);
});

Deno.test("countLines - counts lines correctly", () => {
  assertEquals(countLines("line1\nline2\nline3"), 3);
  assertEquals(countLines("line1\r\nline2"), 2);
  assertEquals(countLines("single line"), 1);
  assertEquals(countLines(""), 1);
  assertEquals(countLines("line1\nline2\n"), 2);
});

Deno.test("countLines - handles mixed endings", () => {
  assertEquals(countLines("line1\r\nline2\nline3\rfinal"), 4);
});
