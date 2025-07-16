/**
 * TTY buffer domain models for managing processed terminal output.
 */

import type { TextAttributes } from "./ansi-sequence-model.ts";

/**
 * Represents a character in the terminal buffer with its attributes.
 */
export interface TerminalCharacter {
  /** The character itself */
  char: string;
  /** Text formatting attributes */
  attributes: TextAttributes;
  /** Width of the character (1 for normal, 2 for wide characters) */
  width: number;
}

/**
 * Represents a line in the terminal buffer.
 */
export interface TerminalLine {
  /** Array of characters in this line */
  characters: TerminalCharacter[];
  /** Whether this line is wrapped from the previous line */
  isWrapped: boolean;
  /** Timestamp when this line was created */
  timestamp: Date;
}

/**
 * Cursor position in the terminal.
 */
export interface CursorPosition {
  /** Column position (0-based) */
  col: number;
  /** Row position (0-based) */
  row: number;
  /** Whether the cursor is visible */
  visible: boolean;
}

/**
 * Terminal screen buffer supporting dual buffers (primary/alternate).
 */
export interface ScreenBuffer {
  /** Lines in the buffer */
  lines: TerminalLine[];
  /** Maximum number of lines to keep in buffer */
  maxLines: number;
  /** Current scroll position (lines from bottom) */
  scrollTop: number;
  /** Number of lines that have scrolled off the top */
  scrolledOffLines: number;
}

/**
 * Complete TTY buffer state including both primary and alternate screens.
 */
export interface TTYBuffer {
  /** ID of the session this buffer belongs to */
  sessionId: string;
  /** Primary screen buffer */
  primaryBuffer: ScreenBuffer;
  /** Alternate screen buffer (used by apps like vim, less) */
  alternateBuffer: ScreenBuffer;
  /** Whether currently using alternate buffer */
  useAlternateBuffer: boolean;
  /** Current cursor position */
  cursor: CursorPosition;
  /** Saved cursor position (for save/restore operations) */
  savedCursor?: CursorPosition;
  /** Current terminal dimensions */
  size: {
    cols: number;
    rows: number;
  };
  /** Current text attributes for new text */
  currentAttributes: TextAttributes;
  /** Whether the terminal is in various modes */
  modes: {
    /** Application cursor key mode */
    applicationCursor: boolean;
    /** Autowrap mode */
    autowrap: boolean;
    /** Insert/replace mode */
    insertMode: boolean;
    /** Local echo mode */
    localEcho: boolean;
  };
  /** Scroll region boundaries (1-based rows, null means no scroll region) */
  scrollRegion: {
    /** Top line of scroll region (1-based) */
    top: number;
    /** Bottom line of scroll region (1-based) */
    bottom: number;
  } | null;
  /** Last time the buffer was updated */
  lastUpdated: Date;
}

/**
 * Factory function to create a new terminal character.
 *
 * @param char - The character
 * @param attributes - Text attributes
 * @param width - Character width (default 1)
 * @returns A new terminal character
 */
export function createTerminalCharacter(
  char: string,
  attributes: TextAttributes,
  width = 1,
): TerminalCharacter {
  return {
    char,
    attributes: { ...attributes },
    width,
  };
}

/**
 * Factory function to create a new terminal line.
 *
 * @param characters - Array of characters (default empty)
 * @param isWrapped - Whether this line is wrapped (default false)
 * @returns A new terminal line
 */
export function createTerminalLine(
  characters: TerminalCharacter[] = [],
  isWrapped = false,
): TerminalLine {
  return {
    characters,
    isWrapped,
    timestamp: new Date(),
  };
}

/**
 * Factory function to create a new cursor position.
 *
 * @param col - Column position (default 0)
 * @param row - Row position (default 0)
 * @param visible - Whether cursor is visible (default true)
 * @returns A new cursor position
 */
export function createCursorPosition(
  col = 0,
  row = 0,
  visible = true,
): CursorPosition {
  return {
    col,
    row,
    visible,
  };
}

/**
 * Factory function to create a new screen buffer.
 *
 * @param maxLines - Maximum number of lines to keep (default 1000)
 * @returns A new screen buffer
 */
export function createScreenBuffer(maxLines = 1000): ScreenBuffer {
  return {
    lines: [],
    maxLines,
    scrollTop: 0,
    scrolledOffLines: 0,
  };
}

/**
 * Factory function to create a new TTY buffer.
 *
 * @param sessionId - ID of the session
 * @param cols - Terminal width in characters (default 80)
 * @param rows - Terminal height in characters (default 24)
 * @returns A new TTY buffer with default settings
 */
export function createTTYBuffer(
  sessionId: string,
  cols = 80,
  rows = 24,
): TTYBuffer {
  return {
    sessionId,
    primaryBuffer: createScreenBuffer(),
    alternateBuffer: createScreenBuffer(),
    useAlternateBuffer: false,
    cursor: createCursorPosition(),
    savedCursor: undefined,
    size: { cols, rows },
    currentAttributes: {
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      blink: false,
      reverse: false,
      strikethrough: false,
      foregroundColor: undefined,
      backgroundColor: undefined,
    },
    modes: {
      applicationCursor: false,
      autowrap: true,
      insertMode: false,
      localEcho: true,
    },
    scrollRegion: null,
    lastUpdated: new Date(),
  };
}

/**
 * Default terminal size constants.
 */
export const DEFAULT_TTY_SIZE = {
  COLS: 80 as number,
  ROWS: 24 as number,
};

/**
 * Buffer limits to prevent memory issues.
 */
export const BUFFER_LIMITS = {
  /** Maximum lines in a buffer */
  MAX_LINES: 10000,
  /** Maximum characters per line */
  MAX_LINE_LENGTH: 4096,
  /** Lines to keep when trimming buffer */
  TRIM_TO_LINES: 1000,
} as const;
