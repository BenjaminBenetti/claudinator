import type {
  TerminalSize,
  TerminalState,
} from "../models/terminal-state-model.ts";
import {
  createTerminalState,
  DEFAULT_TERMINAL_SIZE,
} from "../models/terminal-state-model.ts";
import type { ISSHConnectionService } from "./ssh-connection-service.ts";
import type { ITTYService } from "../../tty/service/tty-service.ts";
import { logger } from "../../logger/logger.ts";

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

  /**
   * Gets the TTY service instance for advanced terminal processing.
   *
   * @returns TTY service instance
   */
  getTTYService(): ITTYService;
}

/**
 * Manages terminal state and rendering for SSH sessions.
 */
export class TerminalService implements ITerminalService {
  private terminalStates = new Map<string, TerminalState>();
  private outputPumps = new Map<string, AbortController>();
  private stateChangeCallbacks = new Map<string, TerminalStateChangeCallback>();
  private ttyService: ITTYService;

  constructor(ttyService: ITTYService) {
    this.ttyService = ttyService;
  }

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

    // Create TTY buffer for processing ANSI sequences
    this.ttyService.createTTYBuffer(
      sessionId,
      terminalSize.cols,
      terminalSize.rows,
      (bufferSessionId, ttyBuffer) => {
        // Convert TTY buffer to terminal state lines
        const visibleLines = this.ttyService.getVisibleLines(bufferSessionId);
        const terminalState = this.terminalStates.get(bufferSessionId);
        if (terminalState) {
          terminalState.outputBuffer = visibleLines;
          // Trigger callback if registered
          const callback = this.stateChangeCallbacks.get(bufferSessionId);
          if (callback) {
            callback(bufferSessionId, terminalState);
          }
        }
      },
    );

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

    // Process output through TTY service for ANSI sequence handling
    this.ttyService.processOutput(sessionId, output);

    // Update terminal state with processed output
    const visibleLines = this.ttyService.getVisibleLines(sessionId);
    state.outputBuffer = visibleLines;

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
          // Log last 12 lines of terminal buffer
          const state = this.terminalStates.get(sessionId);
          if (state) {
            const lastLines = state.outputBuffer.slice(-12);
            logger.debug(
              `Last 12 lines in buffer for session ${sessionId}:`,
              lastLines,
            );
          }
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

    // Update TTY buffer size
    this.ttyService.resizeTerminal(sessionId, size.cols, size.rows);

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

    // Clear TTY buffer
    this.ttyService.clearBuffer(sessionId);

    // Update terminal state
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

    // Clean up TTY buffer
    this.ttyService.removeTTYBuffer(sessionId);

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

  getTTYService(): ITTYService {
    return this.ttyService;
  }
}

/**
 * Factory function to create a terminal service.
 *
 * @param ttyService - TTY service for processing ANSI sequences
 * @returns New terminal service instance
 */
export function createTerminalService(
  ttyService: ITTYService,
): ITerminalService {
  return new TerminalService(ttyService);
}
