/**
 * ANSI escape sequence domain models for terminal output processing.
 */

/**
 * Types of ANSI escape sequences.
 */
export enum ANSISequenceType {
  /** Control Sequence Introducer (ESC[) sequences */
  CSI = "csi",
  /** Operating System Command (ESC]) sequences */
  OSC = "osc",
  /** Simple escape sequences (ESC followed by single character) */
  Escape = "escape",
  /** Device Control String (ESC P) sequences */
  DCS = "dcs",
  /** Application Program Command (ESC _) sequences */
  APC = "apc",
  /** Privacy Message (ESC ^) sequences */
  PM = "pm",
  /** Unknown or unsupported sequence type */
  Unknown = "unknown",
}

/**
 * Security classification for ANSI sequences.
 */
export enum ANSISequurityLevel {
  /** Safe sequences that should be processed */
  Safe = "safe",
  /** Sequences that should be filtered for security */
  Dangerous = "dangerous",
  /** Sequences that are unsupported but harmless */
  Unsupported = "unsupported",
}

/**
 * Categories of ANSI sequence functionality.
 */
export enum ANSISequenceCategory {
  /** Cursor positioning and movement */
  Cursor = "cursor",
  /** Color and formatting */
  Color = "color",
  /** Screen clearing and erasing */
  Erase = "erase",
  /** Text formatting (bold, italic, etc.) */
  Format = "format",
  /** Terminal mode changes */
  Mode = "mode",
  /** Hardware-specific commands */
  Hardware = "hardware",
  /** Device queries and responses */
  Query = "query",
}

/**
 * Represents a parsed ANSI escape sequence.
 */
export interface ANSISequence {
  /** Type of the sequence */
  type: ANSISequenceType;
  /** Security classification */
  securityLevel: ANSISequurityLevel;
  /** Functional category */
  category: ANSISequenceCategory;
  /** Raw sequence string as received */
  raw: string;
  /** Command character (final character of CSI sequences) */
  command?: string;
  /** Parameters extracted from the sequence */
  parameters: number[];
  /** Intermediate characters (for CSI sequences) */
  intermediates?: string;
  /** Whether this sequence was successfully parsed */
  isValid: boolean;
}

/**
 * Text attribute flags for formatting.
 */
export interface TextAttributes {
  /** Bold text */
  bold: boolean;
  /** Dim/faint text */
  dim: boolean;
  /** Italic text */
  italic: boolean;
  /** Underlined text */
  underline: boolean;
  /** Blinking text */
  blink: boolean;
  /** Reverse video (swap fg/bg colors) */
  reverse: boolean;
  /** Strikethrough text */
  strikethrough: boolean;
  /** Foreground color (0-255 for 256-color, or RGB values) */
  foregroundColor?: number | [number, number, number];
  /** Background color (0-255 for 256-color, or RGB values) */
  backgroundColor?: number | [number, number, number];
}

/**
 * Factory function to create default text attributes.
 *
 * @returns Default text attributes with all formatting disabled
 */
export function createDefaultTextAttributes(): TextAttributes {
  return {
    bold: false,
    dim: false,
    italic: false,
    underline: false,
    blink: false,
    reverse: false,
    strikethrough: false,
    foregroundColor: undefined,
    backgroundColor: undefined,
  };
}

/**
 * Factory function to create an ANSI sequence.
 *
 * @param raw - Raw sequence string
 * @param type - Type of the sequence
 * @param category - Functional category
 * @param securityLevel - Security classification
 * @returns A new ANSI sequence object
 */
export function createANSISequence(
  raw: string,
  type: ANSISequenceType,
  category: ANSISequenceCategory,
  securityLevel: ANSISequurityLevel,
): ANSISequence {
  return {
    type,
    securityLevel,
    category,
    raw,
    parameters: [],
    isValid: true,
  };
}

/**
 * Common ANSI sequence patterns and their classifications.
 */
// deno-lint-ignore no-control-regex
export const ANSI_SEQUENCE_PATTERNS = {
  /** Cursor movement sequences */
  // deno-lint-ignore no-control-regex
  CURSOR_HOME: /^\x1b\[H$/,
  // deno-lint-ignore no-control-regex
  CURSOR_POSITION: /^\x1b\[(\d+);(\d+)H$/,
  // deno-lint-ignore no-control-regex
  CURSOR_UP: /^\x1b\[(\d*)A$/,
  // deno-lint-ignore no-control-regex
  CURSOR_DOWN: /^\x1b\[(\d*)B$/,
  // deno-lint-ignore no-control-regex
  CURSOR_FORWARD: /^\x1b\[(\d*)C$/,
  // deno-lint-ignore no-control-regex
  CURSOR_BACKWARD: /^\x1b\[(\d*)D$/,

  /** Erase sequences */
  // deno-lint-ignore no-control-regex
  ERASE_DISPLAY: /^\x1b\[(\d*)J$/,
  // deno-lint-ignore no-control-regex
  ERASE_LINE: /^\x1b\[(\d*)K$/,

  /** Color sequences */
  // deno-lint-ignore no-control-regex
  SGR_SEQUENCE: /^\x1b\[(\d*(;\d+)*)m$/,

  /** Save/restore cursor */
  // deno-lint-ignore no-control-regex
  SAVE_CURSOR: /^\x1b\[s$/,
  // deno-lint-ignore no-control-regex
  RESTORE_CURSOR: /^\x1b\[u$/,

  /** Dangerous OSC sequences */
  // deno-lint-ignore no-control-regex
  OSC_SEQUENCE: /^\x1b\]/,

  /** Terminal mode changes */
  // deno-lint-ignore no-control-regex
  MODE_SET: /^\x1b\[\?(\d+)h$/,
  // deno-lint-ignore no-control-regex
  MODE_RESET: /^\x1b\[\?(\d+)l$/,
} as const;

/**
 * Color codes for basic 8-color palette.
 */
export const BASIC_COLORS = {
  BLACK: 0,
  RED: 1,
  GREEN: 2,
  YELLOW: 3,
  BLUE: 4,
  MAGENTA: 5,
  CYAN: 6,
  WHITE: 7,
} as const;

/**
 * SGR (Select Graphic Rendition) parameter codes.
 */
export const SGR_CODES = {
  RESET: 0,
  BOLD: 1,
  DIM: 2,
  ITALIC: 3,
  UNDERLINE: 4,
  BLINK: 5,
  REVERSE: 7,
  STRIKETHROUGH: 9,
  NORMAL_INTENSITY: 22,
  NO_ITALIC: 23,
  NO_UNDERLINE: 24,
  NO_BLINK: 25,
  NO_REVERSE: 27,
  NO_STRIKETHROUGH: 29,
  FG_BLACK: 30,
  FG_RED: 31,
  FG_GREEN: 32,
  FG_YELLOW: 33,
  FG_BLUE: 34,
  FG_MAGENTA: 35,
  FG_CYAN: 36,
  FG_WHITE: 37,
  FG_EXTENDED: 38,
  FG_DEFAULT: 39,
  BG_BLACK: 40,
  BG_RED: 41,
  BG_GREEN: 42,
  BG_YELLOW: 43,
  BG_BLUE: 44,
  BG_MAGENTA: 45,
  BG_CYAN: 46,
  BG_WHITE: 47,
  BG_EXTENDED: 48,
  BG_DEFAULT: 49,
} as const;
