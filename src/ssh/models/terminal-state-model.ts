/**
 * Terminal state domain models for managing terminal buffer and display state.
 */

/**
 * Represents the state of a terminal session including output buffer and display properties.
 */
export interface TerminalState {
  /** ID of the SSH session this terminal state belongs to */
  sessionId: string;
  /** Array of output lines from the terminal */
  outputBuffer: string[];
  /** Current scroll position in the output buffer */
  scrollPosition: number;
  /** Maximum number of lines to keep in buffer (for memory management) */
  maxBufferLines: number;
  /** Terminal width in characters */
  cols: number;
  /** Terminal height in characters */
  rows: number;
}

/**
 * Represents terminal dimensions.
 */
export interface TerminalSize {
  /** Terminal width in characters */
  cols: number;
  /** Terminal height in characters */
  rows: number;
}

/**
 * Factory function to create a new terminal state.
 *
 * @param sessionId - ID of the SSH session
 * @param size - Initial terminal size
 * @returns A new terminal state with default settings
 */
export function createTerminalState(
  sessionId: string,
  size: TerminalSize,
): TerminalState {
  return {
    sessionId,
    outputBuffer: [],
    scrollPosition: 0,
    maxBufferLines: 1000, // Keep last 1000 lines
    cols: size.cols,
    rows: size.rows,
  };
}

/**
 * Default terminal size for when dimensions cannot be determined.
 */
export const DEFAULT_TERMINAL_SIZE: TerminalSize = {
  cols: 80,
  rows: 24,
};
