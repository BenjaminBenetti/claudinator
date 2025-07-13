/**
 * Utilities for parsing and handling different line ending types in terminal output.
 */

import {
  createParsedLine,
  getLineEndingType,
  LINE_ENDING_PATTERNS,
  LineEndingType,
  type LineParsingResult,
  type ParsedLine,
} from "../models/tty-line-ending-model.ts";
import { logger } from "../../logger/logger.ts";

/**
 * Parses text with mixed line endings into structured lines.
 * Handles CRLF, LF, and CR line endings appropriately.
 *
 * @param text - The text to parse
 * @returns LineParsingResult with parsed lines and any remainder
 */
export function parseLineEndings(text: string): LineParsingResult {
  try {
    const lines: ParsedLine[] = [];
    let currentPosition = 0;

    // Reset the regex to ensure consistent behavior
    LINE_ENDING_PATTERNS.ALL_ENDINGS.lastIndex = 0;

    let match;
    while ((match = LINE_ENDING_PATTERNS.ALL_ENDINGS.exec(text)) !== null) {
      const lineContent = text.slice(currentPosition, match.index);
      const lineEnding = match[0];
      const endingType = getLineEndingType(lineEnding);

      // Carriage return should cause line overwrite behavior
      const shouldOverwrite = endingType === LineEndingType.CR;

      lines.push(createParsedLine(lineContent, endingType, shouldOverwrite));
      currentPosition = match.index + lineEnding.length;
    }

    // Handle any remaining text that doesn't end with a line terminator
    const remainder = text.slice(currentPosition);

    return {
      lines,
      remainder,
    };
  } catch (error) {
    logger.error("Error parsing line endings:", error);
    // Fallback: treat entire text as single line with no ending
    return {
      lines: [createParsedLine(text, null, false)],
      remainder: "",
    };
  }
}

/**
 * Splits text on line boundaries while preserving line ending information.
 * More advanced than simple string.split() as it handles mixed endings.
 *
 * @param text - The text to split
 * @returns Array of parsed lines
 */
export function splitOnLineEndings(text: string): ParsedLine[] {
  const result = parseLineEndings(text);

  // If there's a remainder, add it as a line without ending
  if (result.remainder) {
    result.lines.push(createParsedLine(result.remainder, null, false));
  }

  return result.lines;
}

/**
 * Normalizes line endings in text to a specific type.
 *
 * @param text - The text to normalize
 * @param targetType - The target line ending type
 * @returns Text with normalized line endings
 */
export function normalizeLineEndings(
  text: string,
  targetType: LineEndingType,
): string {
  let targetEnding: string;

  switch (targetType) {
    case LineEndingType.CRLF:
      targetEnding = "\r\n";
      break;
    case LineEndingType.LF:
      targetEnding = "\n";
      break;
    case LineEndingType.CR:
      targetEnding = "\r";
      break;
    default:
      logger.warn(`Unknown line ending type: ${targetType}, using LF`);
      targetEnding = "\n";
  }

  // Reset regex
  LINE_ENDING_PATTERNS.ALL_ENDINGS.lastIndex = 0;

  return text.replace(LINE_ENDING_PATTERNS.ALL_ENDINGS, targetEnding);
}

/**
 * Checks if text contains any line ending characters.
 *
 * @param text - The text to check
 * @returns True if text contains line endings, false otherwise
 */
export function hasLineEndings(text: string): boolean {
  LINE_ENDING_PATTERNS.ALL_ENDINGS.lastIndex = 0;
  return LINE_ENDING_PATTERNS.ALL_ENDINGS.test(text);
}

/**
 * Counts the number of lines in text, accounting for different line ending types.
 *
 * @param text - The text to count lines in
 * @returns Number of lines
 */
export function countLines(text: string): number {
  if (!text) return 1; // Empty text is still 1 line

  const parsed = parseLineEndings(text);
  let lineCount = parsed.lines.length;

  // If there's a remainder, it counts as a line
  if (parsed.remainder) {
    lineCount += 1;
  }

  return Math.max(1, lineCount); // At least 1 line even for empty text
}
