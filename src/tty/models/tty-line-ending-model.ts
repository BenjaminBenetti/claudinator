/**
 * TTY line ending domain models and utilities for handling different terminal line ending styles.
 */

/**
 * Enumeration of supported line ending types.
 */
export enum LineEndingType {
  /** Unix/Linux line ending */
  LF = "LF",
  /** Windows/DOS line ending (treated as single newline) */
  CRLF = "CRLF",
  /** Classic Mac/Carriage return (cursor positioning) */
  CR = "CR",
}

/**
 * Represents a parsed line with its ending type and content.
 */
export interface ParsedLine {
  /** The text content of the line */
  content: string;
  /** The type of line ending that terminated this line */
  endingType: LineEndingType | null;
  /** Whether this line should overwrite the previous line (for CR) */
  shouldOverwrite: boolean;
}

/**
 * Result of parsing text with mixed line endings.
 */
export interface LineParsingResult {
  /** Array of parsed lines */
  lines: ParsedLine[];
  /** Any remaining text that doesn't end with a line terminator */
  remainder: string;
}

/**
 * Line ending constants for pattern matching and processing.
 */
export const LINE_ENDINGS = {
  /** Line feed only (Unix) */
  LF: "\n",
  /** Carriage return + line feed (Windows) */
  CRLF: "\r\n",
  /** Carriage return only (Mac/cursor positioning) */
  CR: "\r",
} as const;

/**
 * Regular expression patterns for line ending detection.
 */
export const LINE_ENDING_PATTERNS = {
  /** Matches CRLF, LF, or CR line endings (CRLF first to match longer sequence) */
  ALL_ENDINGS: /\r\n|\n|\r/g,
  /** Matches just CRLF */
  CRLF_ONLY: /\r\n/g,
  /** Matches just LF */
  LF_ONLY: /\n/g,
  /** Matches just CR */
  CR_ONLY: /\r/g,
} as const;

/**
 * Creates a parsed line instance.
 *
 * @param content - The text content of the line
 * @param endingType - The type of line ending
 * @param shouldOverwrite - Whether this line should overwrite the previous line
 * @returns A new ParsedLine instance
 */
export function createParsedLine(
  content: string,
  endingType: LineEndingType | null,
  shouldOverwrite = false,
): ParsedLine {
  return {
    content,
    endingType,
    shouldOverwrite,
  };
}

/**
 * Determines the line ending type from a line ending string.
 *
 * @param ending - The line ending string
 * @returns The corresponding LineEndingType or null if not recognized
 */
export function getLineEndingType(ending: string): LineEndingType | null {
  switch (ending) {
    case LINE_ENDINGS.CRLF:
      return LineEndingType.CRLF;
    case LINE_ENDINGS.LF:
      return LineEndingType.LF;
    case LINE_ENDINGS.CR:
      return LineEndingType.CR;
    default:
      return null;
  }
}
