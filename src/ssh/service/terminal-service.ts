import type {
  TerminalSize,
  TerminalState,
} from "../models/terminal-state-model.ts";
import {
  createTerminalState,
  DEFAULT_TERMINAL_SIZE,
} from "../models/terminal-state-model.ts";
import type { ISSHConnectionService } from "./ssh-connection-service.ts";
import { logger } from "../../logger/logger.ts";
import { backTrace } from "jsr:@std/internal@^1.0.6/diff";

/**
 * Callback function type for terminal state changes.
 */
export type TerminalStateChangeCallback = (
  sessionId: string,
  state: TerminalState,
) => void;

/**
 * Error thrown when terminal operations fail.
 */
export class TerminalServiceError extends Error {
  constructor(
    message: string,
    public readonly sessionId?: string,
  ) {
    super(message);
    this.name = "TerminalServiceError";
  }
}

/**
 * Interface for terminal service operations.
 */
export interface ITerminalService {
  /**
   * Creates a new terminal state for a session and starts the output pump.
   *
   * @param sessionId - ID of the SSH session
   * @param sshConnectionService - SSH connection service to get output stream from
   * @param size - Initial terminal size
   * @param onStateChange - Optional callback for state changes
   * @returns The created terminal state
   */
  createTerminalState(
    sessionId: string,
    sshConnectionService: ISSHConnectionService,
    size?: TerminalSize,
    onStateChange?: TerminalStateChangeCallback,
  ): TerminalState;

  /**
   * Appends output to the terminal buffer.
   *
   * @param sessionId - ID of the SSH session
   * @param output - Output text to append
   * @throws TerminalServiceError if session not found
   */
  appendOutput(sessionId: string, output: string): void;

  /**
   * Gets the current terminal state for a session.
   *
   * @param sessionId - ID of the SSH session
   * @returns Terminal state or undefined if not found
   */
  getTerminalState(sessionId: string): TerminalState | undefined;

  /**
   * Updates the terminal size and adjusts state accordingly.
   *
   * @param sessionId - ID of the SSH session
   * @param size - New terminal size
   * @throws TerminalServiceError if session not found
   */
  updateTerminalSize(sessionId: string, size: TerminalSize): void;

  /**
   * Scrolls the terminal up by the specified number of lines.
   *
   * @param sessionId - ID of the SSH session
   * @param lines - Number of lines to scroll up
   * @throws TerminalServiceError if session not found
   */
  scrollUp(sessionId: string, lines: number): void;

  /**
   * Scrolls the terminal down by the specified number of lines.
   *
   * @param sessionId - ID of the SSH session
   * @param lines - Number of lines to scroll down
   * @throws TerminalServiceError if session not found
   */
  scrollDown(sessionId: string, lines: number): void;

  /**
   * Gets the visible lines for display based on scroll position.
   *
   * @param sessionId - ID of the SSH session
   * @returns Array of lines to display
   * @throws TerminalServiceError if session not found
   */
  getVisibleLines(sessionId: string): string[];

  /**
   * Clears the terminal buffer for a session.
   *
   * @param sessionId - ID of the SSH session
   * @throws TerminalServiceError if session not found
   */
  clearBuffer(sessionId: string): void;

  /**
   * Removes terminal state for a session.
   *
   * @param sessionId - ID of the SSH session
   */
  removeTerminalState(sessionId: string): void;

  /**
   * Calculates terminal dimensions based on available space.
   *
   * @param availableWidth - Available width in characters
   * @param availableHeight - Available height in characters
   * @returns Calculated terminal size
   */
  calculateTerminalSize(
    availableWidth: number,
    availableHeight: number,
  ): TerminalSize;
}

/**
 * Manages terminal state and rendering for SSH sessions.
 */
export class TerminalService implements ITerminalService {
  private terminalStates = new Map<string, TerminalState>();
  private outputPumps = new Map<string, AbortController>();
  private stateChangeCallbacks = new Map<string, TerminalStateChangeCallback>();

  createTerminalState(
    sessionId: string,
    sshConnectionService: ISSHConnectionService,
    size?: TerminalSize,
    onStateChange?: TerminalStateChangeCallback,
  ): TerminalState {
    const terminalSize = size || DEFAULT_TERMINAL_SIZE;
    logger.info(
      `Creating terminal state for session ${sessionId} (${terminalSize.cols}x${terminalSize.rows})`,
    );

    const state = createTerminalState(sessionId, terminalSize);
    this.terminalStates.set(sessionId, state);

    // Store the callback if provided
    if (onStateChange) {
      this.stateChangeCallbacks.set(sessionId, onStateChange);
    }

    // Start the output pump
    this.startOutputPump(sessionId, sshConnectionService);

    logger.info(
      `Terminal state created and output pump started for session ${sessionId}`,
    );
    return state;
  }

  appendOutput(sessionId: string, output: string): void {
    const state = this.terminalStates.get(sessionId);
    if (!state) {
      logger.error(`Terminal state not found for session: ${sessionId}`);
      throw new TerminalServiceError(
        `Terminal state not found for session: ${sessionId}`,
        sessionId,
      );
    }

    // Split output by lines and process each line
    const lines = output.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && state.outputBuffer.length > 0) {
        // Append to the last line if it's the first line and buffer is not empty
        const lastIndex = state.outputBuffer.length - 1;
        state.outputBuffer[lastIndex] += line;
      } else {
        // Add as new line
        state.outputBuffer.push(line);
      }
    }

    // Trim buffer if it exceeds max lines
    if (state.outputBuffer.length > state.maxBufferLines) {
      const excessLines = state.outputBuffer.length - state.maxBufferLines;
      state.outputBuffer.splice(0, excessLines);

      // Adjust scroll position if needed
      if (state.scrollPosition > 0) {
        state.scrollPosition = Math.max(0, state.scrollPosition - excessLines);
      }
    }

    // Auto-scroll to bottom if we were already at the bottom
    if (this.isAtBottom(state)) {
      this.scrollToBottom(state);
    }

    this.terminalStates.set(sessionId, state);

    // Notify callback if registered
    const callback = this.stateChangeCallbacks.get(sessionId);
    if (callback) {
      callback(sessionId, state);
    }
  }

  getTerminalState(sessionId: string): TerminalState | undefined {
    return this.terminalStates.get(sessionId);
  }

  /**
   * Starts the output pump for a session to automatically read from SSH stream.
   *
   * @param sessionId - ID of the SSH session
   * @param sshConnectionService - SSH connection service to get output stream from
   */
  private startOutputPump(
    sessionId: string,
    sshConnectionService: ISSHConnectionService,
  ): void {
    logger.info(`Starting output pump for session ${sessionId}`);

    const abortController = new AbortController();
    this.outputPumps.set(sessionId, abortController);

    const readOutput = async () => {
      try {
        const outputStream = sshConnectionService.getOutputStream(sessionId);
        const reader = outputStream.getReader();

        while (!abortController.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            logger.info(`Output stream ended for session ${sessionId}`);
            break;
          }
          
          logger.debug(`Read new output for session ${sessionId}: ${value}`);
          // Append output to terminal buffer (this will trigger callback)
          this.appendOutput(sessionId, value);
          logger.info(this.getTerminalState(sessionId)?.outputBuffer.join("\n"));
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          logger.error(`Error in output pump for session ${sessionId}:`, error);
        }
      }
    };

    // Start the pump in the background
    readOutput();
  }

  updateTerminalSize(sessionId: string, size: TerminalSize): void {
    logger.info(
      `Updating terminal size for session ${sessionId} to ${size.cols}x${size.rows}`,
    );

    const state = this.terminalStates.get(sessionId);
    if (!state) {
      throw new TerminalServiceError(
        `Terminal state not found for session: ${sessionId}`,
        sessionId,
      );
    }

    state.cols = size.cols;
    state.rows = size.rows;

    // Adjust scroll position if needed
    this.adjustScrollPosition(state);

    this.terminalStates.set(sessionId, state);
  }

  scrollUp(sessionId: string, lines: number): void {
    const state = this.terminalStates.get(sessionId);
    if (!state) {
      throw new TerminalServiceError(
        `Terminal state not found for session: ${sessionId}`,
        sessionId,
      );
    }

    state.scrollPosition = Math.max(0, state.scrollPosition - lines);
    this.terminalStates.set(sessionId, state);
  }

  scrollDown(sessionId: string, lines: number): void {
    const state = this.terminalStates.get(sessionId);
    if (!state) {
      throw new TerminalServiceError(
        `Terminal state not found for session: ${sessionId}`,
        sessionId,
      );
    }

    const maxScroll = Math.max(0, state.outputBuffer.length - state.rows);
    state.scrollPosition = Math.min(maxScroll, state.scrollPosition + lines);
    this.terminalStates.set(sessionId, state);
  }

  getVisibleLines(sessionId: string): string[] {
    const state = this.terminalStates.get(sessionId);
    if (!state) {
      logger.error(
        `Terminal state not found for getVisibleLines: ${sessionId}`,
      );
      logger.error(
        "Active Sessions:" +
          Array.from(this.terminalStates.values()).map((state) =>
            state.sessionId
          ).join(", "),
      );
      throw new TerminalServiceError(
        `Terminal state not found for session: ${sessionId}`,
        sessionId,
      );
    }

    const startIndex = state.scrollPosition;
    const endIndex = Math.min(
      state.outputBuffer.length,
      startIndex + state.rows,
    );

    const visibleLines = state.outputBuffer.slice(startIndex, endIndex);

    // Pad with empty lines if needed to fill the terminal height
    while (visibleLines.length < state.rows) {
      visibleLines.push("");
    }

    return visibleLines;
  }

  clearBuffer(sessionId: string): void {
    logger.info(`Clearing buffer for session ${sessionId}`);

    const state = this.terminalStates.get(sessionId);
    if (!state) {
      throw new TerminalServiceError(
        `Terminal state not found for session: ${sessionId}`,
        sessionId,
      );
    }

    state.outputBuffer = [];
    state.scrollPosition = 0;
    this.terminalStates.set(sessionId, state);
  }

  removeTerminalState(sessionId: string): void {
    logger.info(`Removing terminal state for session ${sessionId}`);

    // Stop the output pump
    const abortController = this.outputPumps.get(sessionId);
    if (abortController) {
      logger.info(`Stopping output pump for session ${sessionId}`);
      abortController.abort();
      this.outputPumps.delete(sessionId);
    }

    // Clean up state and callback
    this.terminalStates.delete(sessionId);
    this.stateChangeCallbacks.delete(sessionId);

    logger.info(`Terminal state removed for session ${sessionId}`);
  }

  calculateTerminalSize(
    availableWidth: number,
    availableHeight: number,
  ): TerminalSize {
    // Ensure minimum viable terminal size
    const cols = Math.max(1, Math.floor(availableWidth));
    const rows = Math.max(1, Math.floor(availableHeight));

    return { cols, rows };
  }

  /**
   * Checks if the terminal is scrolled to the bottom.
   *
   * @param state - Terminal state to check
   * @returns True if at bottom, false otherwise
   */
  private isAtBottom(state: TerminalState): boolean {
    const maxScroll = Math.max(0, state.outputBuffer.length - state.rows);
    return state.scrollPosition >= maxScroll;
  }

  /**
   * Scrolls the terminal to the bottom.
   *
   * @param state - Terminal state to modify
   */
  private scrollToBottom(state: TerminalState): void {
    const maxScroll = Math.max(0, state.outputBuffer.length - state.rows);
    state.scrollPosition = maxScroll;
  }

  /**
   * Adjusts scroll position after terminal resize.
   *
   * @param state - Terminal state to adjust
   */
  private adjustScrollPosition(state: TerminalState): void {
    const maxScroll = Math.max(0, state.outputBuffer.length - state.rows);
    state.scrollPosition = Math.min(state.scrollPosition, maxScroll);
  }
}

/**
 * Factory function to create a terminal service.
 *
 * @returns New terminal service instance
 */
export function createTerminalService(): ITerminalService {
  return new TerminalService();
}
