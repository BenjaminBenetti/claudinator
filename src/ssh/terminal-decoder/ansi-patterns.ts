/**
 * ANSI escape sequence patterns for terminal text decoding.
 * Based on ANSI X3.64 and VT100/VT220 specifications.
 */

/**
 * Main ANSI escape sequence pattern.
 * Matches CSI (Control Sequence Introducer) sequences: ESC[ followed by parameters and final character.
 */
// deno-lint-ignore no-control-regex
export const CSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]/g;

/**
 * SGR (Select Graphic Rendition) pattern for text formatting and colors.
 * Matches sequences like ESC[0m, ESC[31m, ESC[1;32m etc.
 */
// deno-lint-ignore no-control-regex
export const SGR_PATTERN = /\x1b\[[0-9;]*m/g;

/**
 * Cursor movement and positioning patterns.
 * Includes CUU, CUD, CUF, CUB, CNL, CPL, CHA, CUP, etc.
 */
// deno-lint-ignore no-control-regex
export const CURSOR_PATTERN = /\x1b\[[0-9;]*[ABCDEFGHJK]/g;

/**
 * Screen control patterns.
 * Includes ED (Erase in Display), EL (Erase in Line), etc.
 */
// deno-lint-ignore no-control-regex
export const SCREEN_CONTROL_PATTERN = /\x1b\[[0-9;]*[JK]/g;

/**
 * DEC private mode sequences.
 * These start with ESC[? and control terminal behavior.
 */
// deno-lint-ignore no-control-regex
export const DEC_PRIVATE_PATTERN = /\x1b\[\?[0-9;]*[a-zA-Z]/g;

/**
 * OSC (Operating System Command) sequences.
 * Format: ESC] ... BEL or ESC] ... ESC\
 */
// deno-lint-ignore no-control-regex
export const OSC_PATTERN = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;

/**
 * Simple escape sequences (non-CSI).
 * Includes sequences like ESC7, ESC8, ESCD, etc.
 */
// deno-lint-ignore no-control-regex
export const SIMPLE_ESCAPE_PATTERN = /\x1b[78DEHMZ><=]/g;

/**
 * Application Program Command (APC) sequences.
 * Format: ESC_ ... ESC\
 */
// deno-lint-ignore no-control-regex
export const APC_PATTERN = /\x1b_[^\x1b]*\x1b\\/g;

/**
 * Device Control String (DCS) sequences.
 * Format: ESCP ... ESC\
 */
// deno-lint-ignore no-control-regex
export const DCS_PATTERN = /\x1bP[^\x1b]*\x1b\\/g;

/**
 * Privacy Message (PM) sequences.
 * Format: ESC^ ... ESC\
 */
// deno-lint-ignore no-control-regex
export const PM_PATTERN = /\x1b\^[^\x1b]*\x1b\\/g;

/**
 * Comprehensive pattern that matches all ANSI escape sequences.
 * This combines all the above patterns for complete ANSI stripping.
 */
export const ALL_ANSI_PATTERN = new RegExp(
  [
    OSC_PATTERN.source,
    DCS_PATTERN.source,
    APC_PATTERN.source,
    PM_PATTERN.source,
    DEC_PRIVATE_PATTERN.source,
    CSI_PATTERN.source,
    SIMPLE_ESCAPE_PATTERN.source,
  ].join("|"),
  "g",
);

/**
 * Pattern for detecting incomplete ANSI sequences at the end of input.
 * Used for buffering partial sequences across multiple decode calls.
 */
// deno-lint-ignore no-control-regex
export const INCOMPLETE_ANSI_PATTERN = /\x1b(\[([0-9;]*)?)?$/;

/**
 * Bell character (ASCII 7) - often used to terminate OSC sequences.
 */
export const BELL_CHAR = "\x07";

/**
 * String terminator sequence (ESC\) - used to terminate various sequences.
 */
export const STRING_TERMINATOR = "\x1b\\";

/**
 * Control characters that should be preserved (like newline, carriage return, tab).
 * These are not ANSI escape sequences but control the text layout.
 */
export const PRESERVED_CONTROL_CHARS = /[\n\r\t]/g;

/**
 * Checks if a string contains any ANSI escape sequences.
 *
 * @param text - The text to check
 * @returns True if ANSI sequences are found, false otherwise
 */
export function containsAnsiSequences(text: string): boolean {
  return ALL_ANSI_PATTERN.test(text);
}

/**
 * Extracts the incomplete ANSI sequence from the end of a string, if any.
 *
 * @param text - The text to check
 * @returns The incomplete sequence or empty string if none found
 */
export function extractIncompleteSequence(text: string): string {
  const match = text.match(INCOMPLETE_ANSI_PATTERN);
  return match ? match[0] : "";
}
