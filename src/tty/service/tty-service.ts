import type { TextAttributes as _TextAttributes } from "../models/ansi-sequence-model.ts";
import {
  createDefaultTextAttributes,
  SGR_CODES,
} from "../models/ansi-sequence-model.ts";
import type { ScreenBuffer, TTYBuffer } from "../models/tty-buffer-model.ts";
import {
  BUFFER_LIMITS,
  createTerminalCharacter,
  createTerminalLine,
  createTTYBuffer,
  DEFAULT_TTY_SIZE,
} from "../models/tty-buffer-model.ts";
import { logger } from "../../logger/logger.ts";

/**
 * Callback function type for TTY buffer changes.
 */
export type TTYBufferChangeCallback = (
  sessionId: string,
  buffer: TTYBuffer,
) => void;

/**
 * Error thrown when TTY operations fail.
 */
export class TTYServiceError extends Error {
  constructor(
    message: string,
    public readonly sessionId?: string,
  ) {
    super(message);
    this.name = "TTYServiceError";
  }
}

/**
 * Parser state for ANSI escape sequence processing.
 */
enum ParserState {
  /** Normal text processing */
  Normal = "normal",
  /** Escape sequence started (ESC received) */
  Escape = "escape",
  /** CSI sequence in progress (ESC[ received) */
  CSI = "csi",
  /** OSC sequence in progress (ESC] received) */
  OSC = "osc",
  /** Parameter collection for CSI sequences */
  Parameters = "parameters",
}

/**
 * Interface for TTY service operations.
 */
export interface ITTYService {
  /**
   * Creates a new TTY buffer for a session.
   *
   * @param sessionId - ID of the session
   * @param cols - Terminal width in characters
   * @param rows - Terminal height in characters
   * @param onBufferChange - Optional callback for buffer changes
   * @returns The created TTY buffer
   */
  createTTYBuffer(
    sessionId: string,
    cols?: number,
    rows?: number,
    onBufferChange?: TTYBufferChangeCallback,
  ): TTYBuffer;

  /**
   * Processes raw terminal output and updates the TTY buffer.
   *
   * @param sessionId - ID of the session
   * @param data - Raw terminal output to process
   * @throws TTYServiceError if session not found
   */
  processOutput(sessionId: string, data: string): void;

  /**
   * Gets the current TTY buffer for a session.
   *
   * @param sessionId - ID of the session
   * @returns TTY buffer or undefined if not found
   */
  getTTYBuffer(sessionId: string): TTYBuffer | undefined;

  /**
   * Gets the visible lines from the current buffer for display.
   *
   * @param sessionId - ID of the session
   * @returns Array of formatted lines ready for display
   * @throws TTYServiceError if session not found
   */
  getVisibleLines(sessionId: string): string[];

  /**
   * Gets visible lines with their actual buffer indices for proper rendering.
   * This method provides both the line content and the actual buffer line index,
   * enabling proper character-level rendering with attributes.
   *
   * @param sessionId - ID of the session
   * @returns Array of visible lines with their buffer indices
   * @throws TTYServiceError if session not found
   */
  getVisibleLinesWithIndices(
    sessionId: string,
  ): Array<{ lineIndex: number; lineText: string }>;

  /**
   * Resizes the terminal and adjusts the buffer accordingly.
   *
   * @param sessionId - ID of the session
   * @param cols - New width in characters
   * @param rows - New height in characters
   * @throws TTYServiceError if session not found
   */
  resizeTerminal(sessionId: string, cols: number, rows: number): void;

  /**
   * Clears the terminal buffer.
   *
   * @param sessionId - ID of the session
   * @param clearType - Type of clear operation (0=below cursor, 1=above cursor, 2=entire screen)
   * @throws TTYServiceError if session not found
   */
  clearBuffer(sessionId: string, clearType?: number): void;

  /**
   * Removes TTY buffer for a session.
   *
   * @param sessionId - ID of the session
   */
  removeTTYBuffer(sessionId: string): void;
}

/**
 * TTY service that processes ANSI escape sequences and manages terminal buffers.
 */
export class TTYService implements ITTYService {
  private ttyBuffers = new Map<string, TTYBuffer>();
  private bufferChangeCallbacks = new Map<string, TTYBufferChangeCallback>();
  private parserStates = new Map<string, ParserState>();
  private currentSequences = new Map<string, string>();

  createTTYBuffer(
    sessionId: string,
    cols = DEFAULT_TTY_SIZE.COLS,
    rows = DEFAULT_TTY_SIZE.ROWS,
    onBufferChange?: TTYBufferChangeCallback,
  ): TTYBuffer {
    logger.info(
      `Creating TTY buffer for session ${sessionId} (${cols}x${rows})`,
    );

    const buffer = createTTYBuffer(sessionId, cols, rows);
    this.ttyBuffers.set(sessionId, buffer);
    this.parserStates.set(sessionId, ParserState.Normal);
    this.currentSequences.set(sessionId, "");

    if (onBufferChange) {
      this.bufferChangeCallbacks.set(sessionId, onBufferChange);
    }

    logger.info(`TTY buffer created for session ${sessionId}`);
    return buffer;
  }

  processOutput(sessionId: string, data: string): void {
    const buffer = this.ttyBuffers.get(sessionId);
    if (!buffer) {
      logger.error(`TTY buffer not found for session: ${sessionId}`);
      throw new TTYServiceError(
        `TTY buffer not found for session: ${sessionId}`,
        sessionId,
      );
    }

    logger.debug(
      `Processing ${data.length} characters for session ${sessionId}`,
    );

    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      this.processCharacter(sessionId, char, buffer);
    }

    // Update timestamp and notify callback
    buffer.lastUpdated = new Date();
    this.ttyBuffers.set(sessionId, buffer);

    const callback = this.bufferChangeCallbacks.get(sessionId);
    if (callback) {
      callback(sessionId, buffer);
    }
  }

  getTTYBuffer(sessionId: string): TTYBuffer | undefined {
    return this.ttyBuffers.get(sessionId);
  }

  getVisibleLines(sessionId: string): string[] {
    const buffer = this.ttyBuffers.get(sessionId);
    if (!buffer) {
      throw new TTYServiceError(
        `TTY buffer not found for session: ${sessionId}`,
        sessionId,
      );
    }

    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    const visibleLines: string[] = [];
    const startRow = Math.max(0, currentBuffer.scrollTop);
    const endRow = Math.min(
      currentBuffer.lines.length,
      startRow + buffer.size.rows,
    );

    for (let row = startRow; row < endRow; row++) {
      if (row < currentBuffer.lines.length) {
        const line = currentBuffer.lines[row];
        const lineText = line.characters.map((char) => char.char).join("");
        visibleLines.push(lineText);
      } else {
        visibleLines.push("");
      }
    }

    // Pad with empty lines to fill terminal height
    while (visibleLines.length < buffer.size.rows) {
      visibleLines.push("");
    }

    return visibleLines;
  }

  /**
   * Gets visible lines with their actual buffer indices for proper rendering.
   * This method provides both the line content and the actual buffer line index,
   * enabling proper character-level rendering with attributes.
   *
   * @param sessionId - ID of the session
   * @returns Array of visible lines with their buffer indices
   */
  getVisibleLinesWithIndices(
    sessionId: string,
  ): Array<{ lineIndex: number; lineText: string }> {
    const buffer = this.ttyBuffers.get(sessionId);
    if (!buffer) {
      throw new TTYServiceError(
        `TTY buffer not found for session: ${sessionId}`,
        sessionId,
      );
    }

    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    const visibleLines: Array<{ lineIndex: number; lineText: string }> = [];
    const startRow = Math.max(0, currentBuffer.scrollTop);
    const endRow = Math.min(
      currentBuffer.lines.length,
      startRow + buffer.size.rows,
    );

    for (let row = startRow; row < endRow; row++) {
      if (row < currentBuffer.lines.length) {
        const line = currentBuffer.lines[row];
        const lineText = line.characters.map((char) => char.char).join("");
        visibleLines.push({ lineIndex: row, lineText });
      } else {
        visibleLines.push({ lineIndex: -1, lineText: "" });
      }
    }

    return visibleLines;
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const buffer = this.ttyBuffers.get(sessionId);
    if (!buffer) {
      throw new TTYServiceError(
        `TTY buffer not found for session: ${sessionId}`,
        sessionId,
      );
    }

    logger.info(
      `Resizing terminal for session ${sessionId} to ${cols}x${rows}`,
    );

    buffer.size.cols = cols;
    buffer.size.rows = rows;

    // Adjust cursor position if it's outside new bounds
    if (buffer.cursor.col >= cols) {
      buffer.cursor.col = Math.max(0, cols - 1);
    }
    if (buffer.cursor.row >= rows) {
      buffer.cursor.row = Math.max(0, rows - 1);
    }

    buffer.lastUpdated = new Date();
    this.ttyBuffers.set(sessionId, buffer);
  }

  clearBuffer(sessionId: string, clearType = 2): void {
    const buffer = this.ttyBuffers.get(sessionId);
    if (!buffer) {
      throw new TTYServiceError(
        `TTY buffer not found for session: ${sessionId}`,
        sessionId,
      );
    }

    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    switch (clearType) {
      case 0: // Clear from cursor to end of screen
        this.clearFromCursor(buffer, currentBuffer);
        break;
      case 1: // Clear from start of screen to cursor
        this.clearToCursor(buffer, currentBuffer);
        break;
      case 2: // Clear entire screen
      default:
        currentBuffer.lines = [];
        currentBuffer.scrollTop = 0;
        currentBuffer.scrolledOffLines = 0;
        buffer.cursor.col = 0;
        buffer.cursor.row = 0;
        break;
    }

    buffer.lastUpdated = new Date();
    this.ttyBuffers.set(sessionId, buffer);
  }

  removeTTYBuffer(sessionId: string): void {
    logger.info(`Removing TTY buffer for session ${sessionId}`);

    this.ttyBuffers.delete(sessionId);
    this.bufferChangeCallbacks.delete(sessionId);
    this.parserStates.delete(sessionId);
    this.currentSequences.delete(sessionId);

    logger.info(`TTY buffer removed for session ${sessionId}`);
  }

  /**
   * Processes a single character through the ANSI parser state machine.
   *
   * @param sessionId - ID of the session
   * @param char - Character to process
   * @param buffer - TTY buffer to update
   */
  private processCharacter(
    sessionId: string,
    char: string,
    buffer: TTYBuffer,
  ): void {
    const state = this.parserStates.get(sessionId) || ParserState.Normal;
    const sequence = this.currentSequences.get(sessionId) || "";

    switch (state) {
      case ParserState.Normal:
        if (char === "\x1b") {
          this.parserStates.set(sessionId, ParserState.Escape);
          this.currentSequences.set(sessionId, char);
        } else {
          this.processNormalCharacter(char, buffer);
        }
        break;

      case ParserState.Escape:
        this.currentSequences.set(sessionId, sequence + char);
        if (char === "[") {
          this.parserStates.set(sessionId, ParserState.CSI);
        } else if (char === "]") {
          this.parserStates.set(sessionId, ParserState.OSC);
        } else {
          // Simple escape sequence
          this.processEscapeSequence(sequence + char, buffer);
          this.resetParser(sessionId);
        }
        break;

      case ParserState.CSI:
        this.currentSequences.set(sessionId, sequence + char);
        if (this.isCSIFinalChar(char)) {
          this.processCSISequence(sequence + char, buffer);
          this.resetParser(sessionId);
        }
        break;

      case ParserState.OSC:
        this.currentSequences.set(sessionId, sequence + char);
        if (char === "\x07" || (char === "\\" && sequence.endsWith("\x1b"))) {
          // OSC sequences are potentially dangerous, so we filter them
          logger.debug(`Filtered dangerous OSC sequence: ${sequence + char}`);
          this.resetParser(sessionId);
        }
        break;
    }
  }

  /**
   * Processes normal printable characters.
   *
   * @param char - Character to process
   * @param buffer - TTY buffer to update
   */
  private processNormalCharacter(char: string, buffer: TTYBuffer): void {
    switch (char) {
      case "\r": // Carriage return
        buffer.cursor.col = 0;
        break;
      case "\n": // Line feed
        this.moveCursorDown(buffer);
        buffer.cursor.col = 0; // Reset to beginning of new line
        break;
      case "\t": // Tab
        this.processTab(buffer);
        break;
      case "\b": // Backspace
        if (buffer.cursor.col > 0) {
          buffer.cursor.col--;
        }
        break;
      default:
        if (char >= " " && char !== "\x7f") {
          // Printable character
          this.insertCharacter(char, buffer);
        }
        break;
    }
  }

  /**
   * Inserts a character at the current cursor position.
   *
   * @param char - Character to insert
   * @param buffer - TTY buffer to update
   */
  private insertCharacter(char: string, buffer: TTYBuffer): void {
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    // Convert cursor position to absolute buffer position
    const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;

    // Ensure we have enough lines
    while (currentBuffer.lines.length <= absoluteRow) {
      currentBuffer.lines.push(createTerminalLine());
    }

    const line = currentBuffer.lines[absoluteRow];

    // Ensure line has enough characters
    while (line.characters.length <= buffer.cursor.col) {
      line.characters.push(
        createTerminalCharacter(" ", createDefaultTextAttributes()),
      );
    }

    // Insert the character
    const terminalChar = createTerminalCharacter(
      char,
      { ...buffer.currentAttributes },
    );

    if (buffer.modes.insertMode) {
      line.characters.splice(buffer.cursor.col, 0, terminalChar);
    } else {
      line.characters[buffer.cursor.col] = terminalChar;
    }

    // Move cursor forward
    buffer.cursor.col++;

    // Handle line wrapping
    if (buffer.cursor.col >= buffer.size.cols && buffer.modes.autowrap) {
      buffer.cursor.col = 0;
      this.moveCursorDown(buffer);
    }
  }

  /**
   * Moves cursor down one line, scrolling if necessary.
   *
   * @param buffer - TTY buffer to update
   */
  private moveCursorDown(buffer: TTYBuffer): void {
    buffer.cursor.row++;

    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    // Check if we have a scroll region defined
    if (buffer.scrollRegion) {
      const scrollBottom = buffer.scrollRegion.bottom - 1; // Convert to 0-based

      // If cursor moves beyond the scroll region bottom, scroll within the region
      if (buffer.cursor.row > scrollBottom) {
        buffer.cursor.row = scrollBottom;
        this.scrollWithinRegion(buffer, 1); // Scroll down by 1 line
      }
    } else {
      // No scroll region - use traditional screen scrolling
      if (buffer.cursor.row >= buffer.size.rows) {
        // Calculate how many lines to scroll
        const scrollAmount = buffer.cursor.row - buffer.size.rows + 1;

        // Calculate where the new content should be added in absolute terms
        const newAbsoluteRow = currentBuffer.scrollTop + buffer.size.rows - 1 +
          scrollAmount;

        // Ensure we have enough lines up to this position
        while (currentBuffer.lines.length <= newAbsoluteRow) {
          currentBuffer.lines.push(createTerminalLine());
        }

        // Move cursor back to bottom of visible area
        buffer.cursor.row = buffer.size.rows - 1;

        // Scroll down to show new content
        currentBuffer.scrollTop += scrollAmount;

        // Trim buffer if it's too large
        if (currentBuffer.lines.length > currentBuffer.maxLines) {
          const removeCount = currentBuffer.lines.length -
            BUFFER_LIMITS.TRIM_TO_LINES;
          currentBuffer.lines.splice(0, removeCount);
          currentBuffer.scrolledOffLines += removeCount;
          currentBuffer.scrollTop = Math.max(
            0,
            currentBuffer.scrollTop - removeCount,
          );
        }
      }
    }
  }

  /**
   * Processes tab character (moves to next tab stop).
   *
   * @param buffer - TTY buffer to update
   */
  private processTab(buffer: TTYBuffer): void {
    const nextTabStop = Math.floor((buffer.cursor.col + 8) / 8) * 8;
    buffer.cursor.col = Math.min(nextTabStop, buffer.size.cols - 1);
  }

  /**
   * Processes CSI escape sequences.
   *
   * @param sequence - Complete CSI sequence
   * @param buffer - TTY buffer to update
   */
  private processCSISequence(sequence: string, buffer: TTYBuffer): void {
    logger.debug(`Processing CSI sequence: ${sequence}`);

    // deno-lint-ignore no-control-regex
    const match = sequence.match(/^\x1b\[([?!]?)([0-9;:]*)(.)/);
    if (!match) {
      logger.debug(`Invalid CSI sequence: ${sequence}`);
      return;
    }

    const prefix = match[1];
    const paramsStr = match[2];
    const command = match[3];

    // Validate that the command character is a valid CSI final character (0x40-0x7E)
    const commandCode = command.charCodeAt(0);
    if (commandCode < 0x40 || commandCode > 0x7E) {
      logger.debug(
        `Invalid CSI final character: ${command} (code: ${commandCode})`,
      );
      return;
    }

    const params = paramsStr ? paramsStr.split(";").map(Number) : [];

    switch (command) {
      case "H": // Cursor position
      case "f": // Horizontal and vertical position
        this.setCursorPosition(buffer, params);
        break;
      case "A": // Cursor up
        this.moveCursor(buffer, 0, -(params[0] || 1));
        break;
      case "B": // Cursor down
        this.moveCursor(buffer, 0, params[0] || 1);
        break;
      case "C": // Cursor forward
        this.moveCursor(buffer, params[0] || 1, 0);
        break;
      case "D": // Cursor backward
        this.moveCursor(buffer, -(params[0] || 1), 0);
        break;
      case "J": // Erase display
        this.clearBuffer(buffer.sessionId, params[0] || 0);
        break;
      case "K": // Erase line
        this.eraseLine(buffer, params[0] || 0);
        break;
      case "m": // SGR (Select Graphic Rendition)
        this.processSGR(buffer, params);
        break;
      case "s": // Save cursor position
        buffer.savedCursor = { ...buffer.cursor };
        break;
      case "u": // Restore cursor position
        if (buffer.savedCursor) {
          // Validate saved cursor position against current terminal size
          buffer.cursor = {
            row: Math.max(
              0,
              Math.min(buffer.savedCursor.row, buffer.size.rows - 1),
            ),
            col: Math.max(
              0,
              Math.min(buffer.savedCursor.col, buffer.size.cols - 1),
            ),
            visible: buffer.savedCursor.visible,
          };
        }
        break;
      case "G": // Cursor Horizontal Absolute (CHA)
        this.setCursorColumn(buffer, params[0] || 1);
        break;
      case "l": // Reset Mode (RM)
        this.resetMode(buffer, prefix, params);
        break;
      case "h": // Set Mode (SM)
        this.setMode(buffer, prefix, params);
        break;
      case "p": // Soft terminal reset or other functions
        this.handlePCommand(buffer, prefix, params);
        break;
      case "r": // Set scrolling region (DECSTBM)
        this.setScrollRegion(buffer, params);
        break;
      case "L": // Insert Line (IL)
        this.insertLines(buffer, params[0] || 1);
        break;
      case "M": // Delete Line (DL)
        this.deleteLines(buffer, params[0] || 1);
        break;
      default:
        logger.debug(`Unsupported CSI command: ${command}`);
        break;
    }
  }

  /**
   * Sets cursor position from CSI H or f command.
   *
   * @param buffer - TTY buffer to update
   * @param params - Parameters from the sequence
   */
  private setCursorPosition(buffer: TTYBuffer, params: number[]): void {
    const row = Math.max(0, (params[0] || 1) - 1);
    const col = Math.max(0, (params[1] || 1) - 1);

    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    // When there's a scroll region, cursor positioning is relative to the scroll region
    if (buffer.scrollRegion) {
      const scrollTop = buffer.scrollRegion.top - 1; // Convert to 0-based
      const scrollBottom = buffer.scrollRegion.bottom - 1; // Convert to 0-based

      // Position cursor relative to scroll region top
      buffer.cursor.row = Math.min(scrollTop + row, scrollBottom);
      buffer.cursor.col = Math.min(col, buffer.size.cols - 1);

      // Ensure buffer has lines up to cursor position
      const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;
      this.ensureBufferLines(buffer, absoluteRow);
    } else {
      // Cursor position is relative to the visible area (not absolute buffer position)
      // Ensure cursor stays within viewport bounds
      buffer.cursor.row = Math.min(row, buffer.size.rows - 1);
      buffer.cursor.col = Math.min(col, buffer.size.cols - 1);

      // Ensure buffer has lines up to cursor position
      const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;
      this.ensureBufferLines(buffer, absoluteRow);
    }
  }

  /**
   * Sets cursor column from CSI G command (Cursor Horizontal Absolute).
   *
   * @param buffer - TTY buffer to update
   * @param column - Column position (1-based)
   */
  private setCursorColumn(buffer: TTYBuffer, column: number): void {
    const col = Math.max(0, column - 1); // Convert from 1-based to 0-based
    buffer.cursor.col = Math.min(col, buffer.size.cols - 1); // Ensure within viewport bounds
  }

  /**
   * Moves cursor by relative amount.
   *
   * @param buffer - TTY buffer to update
   * @param deltaCol - Column delta
   * @param deltaRow - Row delta
   */
  private moveCursor(
    buffer: TTYBuffer,
    deltaCol: number,
    deltaRow: number,
  ): void {
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    // Update column position
    buffer.cursor.col = Math.max(
      0,
      Math.min(
        buffer.size.cols - 1,
        buffer.cursor.col + deltaCol,
      ),
    );

    const newCursorRow = buffer.cursor.row + deltaRow;

    // Handle row movement with scroll region consideration
    if (buffer.scrollRegion) {
      const scrollTop = buffer.scrollRegion.top - 1; // Convert to 0-based
      const scrollBottom = buffer.scrollRegion.bottom - 1; // Convert to 0-based

      // Keep cursor within scroll region bounds
      buffer.cursor.row = Math.max(
        scrollTop,
        Math.min(newCursorRow, scrollBottom),
      );

      // Ensure buffer has lines up to cursor position
      const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;
      this.ensureBufferLines(buffer, absoluteRow);
    } else {
      // Only adjust scroll if cursor moves below the visible area (normal terminal behavior)
      // Don't auto-scroll when cursor moves above - let content stay where it was written
      if (newCursorRow >= buffer.size.rows) {
        // Cursor moved below visible area - scroll down to follow
        const scrollAmount = newCursorRow - buffer.size.rows + 1;
        currentBuffer.scrollTop += scrollAmount;
        buffer.cursor.row = buffer.size.rows - 1; // Keep cursor at bottom of viewport

        // Ensure buffer has lines up to new scroll position
        const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;
        this.ensureBufferLines(buffer, absoluteRow);
      } else {
        buffer.cursor.row = Math.max(
          0,
          Math.min(newCursorRow, buffer.size.rows - 1),
        );

        // Ensure buffer has lines up to cursor position
        const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;
        this.ensureBufferLines(buffer, absoluteRow);
      }
    }
  }

  /**
   * Erases part of the current line.
   *
   * @param buffer - TTY buffer to update
   * @param eraseType - Type of erase (0=to end, 1=to start, 2=entire line)
   */
  private eraseLine(buffer: TTYBuffer, eraseType: number): void {
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    // Convert cursor position to absolute buffer position
    const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;

    // Ensure we have enough lines up to the cursor position
    while (currentBuffer.lines.length <= absoluteRow) {
      currentBuffer.lines.push(createTerminalLine());
    }

    const line = currentBuffer.lines[absoluteRow];
    const emptyChar = createTerminalCharacter(
      " ",
      createDefaultTextAttributes(),
    );

    switch (eraseType) {
      case 0: // Erase from cursor to end of line
        line.characters.splice(buffer.cursor.col);
        break;
      case 1: // Erase from start of line to cursor
        for (let i = 0; i <= buffer.cursor.col; i++) {
          line.characters[i] = emptyChar;
        }
        break;
      case 2: // Erase entire line
        line.characters = [];
        break;
    }
  }

  /**
   * Processes SGR (color and formatting) sequences.
   *
   * @param buffer - TTY buffer to update
   * @param params - SGR parameters
   */
  private processSGR(buffer: TTYBuffer, params: number[]): void {
    if (params.length === 0) {
      params = [0]; // Default to reset
    }

    for (let i = 0; i < params.length; i++) {
      const param = params[i];

      switch (param) {
        case SGR_CODES.RESET:
          buffer.currentAttributes = createDefaultTextAttributes();
          break;
        case SGR_CODES.BOLD:
          buffer.currentAttributes.bold = true;
          break;
        case SGR_CODES.DIM:
          buffer.currentAttributes.dim = true;
          break;
        case SGR_CODES.ITALIC:
          buffer.currentAttributes.italic = true;
          break;
        case SGR_CODES.UNDERLINE:
          buffer.currentAttributes.underline = true;
          break;
        case SGR_CODES.BLINK:
          buffer.currentAttributes.blink = true;
          break;
        case SGR_CODES.REVERSE:
          buffer.currentAttributes.reverse = true;
          break;
        case SGR_CODES.STRIKETHROUGH:
          buffer.currentAttributes.strikethrough = true;
          break;
        case SGR_CODES.NORMAL_INTENSITY:
          buffer.currentAttributes.bold = false;
          buffer.currentAttributes.dim = false;
          break;
        case SGR_CODES.NO_ITALIC:
          buffer.currentAttributes.italic = false;
          break;
        case SGR_CODES.NO_UNDERLINE:
          buffer.currentAttributes.underline = false;
          break;
        case SGR_CODES.NO_BLINK:
          buffer.currentAttributes.blink = false;
          break;
        case SGR_CODES.NO_REVERSE:
          buffer.currentAttributes.reverse = false;
          break;
        case SGR_CODES.NO_STRIKETHROUGH:
          buffer.currentAttributes.strikethrough = false;
          break;
        default:
          if (param >= SGR_CODES.FG_BLACK && param <= SGR_CODES.FG_WHITE) {
            buffer.currentAttributes.foregroundColor = param -
              SGR_CODES.FG_BLACK;
          } else if (
            param >= SGR_CODES.BG_BLACK && param <= SGR_CODES.BG_WHITE
          ) {
            buffer.currentAttributes.backgroundColor = param -
              SGR_CODES.BG_BLACK;
          } else if (param === SGR_CODES.FG_DEFAULT) {
            buffer.currentAttributes.foregroundColor = undefined;
          } else if (param === SGR_CODES.BG_DEFAULT) {
            buffer.currentAttributes.backgroundColor = undefined;
          }
          break;
      }
    }
  }

  /**
   * Processes simple escape sequences.
   *
   * @param sequence - Complete escape sequence
   * @param buffer - TTY buffer to update
   */
  private processEscapeSequence(sequence: string, _buffer: TTYBuffer): void {
    logger.debug(`Processing escape sequence: ${sequence}`);
    // Most simple escape sequences are not commonly used in modern terminals
    // We can expand this as needed
  }

  /**
   * Checks if a character is a CSI final character.
   *
   * @param char - Character to check
   * @returns True if it's a CSI final character
   */
  private isCSIFinalChar(char: string): boolean {
    const code = char.charCodeAt(0);
    return (code >= 0x40 && code <= 0x7E); // @ through ~
  }

  /**
   * Resets the parser state to normal.
   *
   * @param sessionId - ID of the session
   */
  private resetParser(sessionId: string): void {
    this.parserStates.set(sessionId, ParserState.Normal);
    this.currentSequences.set(sessionId, "");
  }

  /**
   * Clears from cursor to end of screen.
   *
   * @param buffer - TTY buffer
   * @param currentBuffer - Current screen buffer
   */
  private clearFromCursor(
    buffer: TTYBuffer,
    currentBuffer: ScreenBuffer,
  ): void {
    // Convert cursor position to absolute buffer position
    const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;

    // Clear from cursor to end of current line
    if (absoluteRow < currentBuffer.lines.length) {
      const line = currentBuffer.lines[absoluteRow];
      line.characters.splice(buffer.cursor.col);
    }

    // Clear all lines below cursor
    if (absoluteRow + 1 < currentBuffer.lines.length) {
      currentBuffer.lines.splice(absoluteRow + 1);
    }
  }

  /**
   * Clears from start of screen to cursor.
   *
   * @param buffer - TTY buffer
   * @param currentBuffer - Current screen buffer
   */
  private clearToCursor(buffer: TTYBuffer, currentBuffer: ScreenBuffer): void {
    const emptyChar = createTerminalCharacter(
      " ",
      createDefaultTextAttributes(),
    );

    // Convert cursor position to absolute buffer position
    const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;

    // Clear all lines above cursor in the visible area
    for (
      let row = currentBuffer.scrollTop;
      row < absoluteRow && row < currentBuffer.lines.length;
      row++
    ) {
      currentBuffer.lines[row].characters = [];
    }

    // Clear from start of current line to cursor
    if (absoluteRow < currentBuffer.lines.length) {
      const line = currentBuffer.lines[absoluteRow];
      for (let col = 0; col <= buffer.cursor.col; col++) {
        if (col < line.characters.length) {
          line.characters[col] = emptyChar;
        }
      }
    }
  }

  /**
   * Handles CSI Reset Mode (RM) commands.
   *
   * @param buffer - TTY buffer
   * @param prefix - CSI prefix (? for private modes)
   * @param params - Mode parameters
   */
  private resetMode(buffer: TTYBuffer, prefix: string, params: number[]): void {
    if (prefix === "?") {
      // Private mode reset
      for (const param of params) {
        switch (param) {
          case 47: // Alternate screen buffer (basic)
            logger.debug("Switching to normal screen buffer (mode 47)");
            buffer.useAlternateBuffer = false;
            break;
          case 1047: // Restore cursor and switch to normal buffer
            logger.debug(
              "Restoring cursor and switching to normal screen buffer (mode 1047)",
            );
            if (buffer.savedCursor) {
              buffer.cursor = { ...buffer.savedCursor };
              buffer.savedCursor = undefined;
            }
            buffer.useAlternateBuffer = false;
            break;
          case 1049: // Restore cursor and screen, switch to normal buffer
            logger.debug(
              "Restoring cursor/screen and switching to normal screen buffer (mode 1049)",
            );
            if (buffer.savedCursor) {
              buffer.cursor = { ...buffer.savedCursor };
              buffer.savedCursor = undefined;
            }
            buffer.useAlternateBuffer = false;
            break;
          case 2004: // Bracketed paste mode
            // Disable bracketed paste mode (most terminals ignore this)
            break;
          case 3: // 80/132 column mode
            // Reset to 80 columns (we'll ignore this)
            break;
          case 4: // Smooth scrolling
            // Reset smooth scrolling (we'll ignore this)
            break;
          case 69: // Left/right margin mode
            // Reset margins (we'll ignore this)
            break;
          default:
            logger.debug(`Unsupported private mode reset: ${param}`);
            break;
        }
      }
    } else {
      // Standard mode reset
      for (const param of params) {
        switch (param) {
          case 4: // Insert mode
            buffer.modes.insertMode = false;
            break;
          default:
            logger.debug(`Unsupported mode reset: ${param}`);
            break;
        }
      }
    }
  }

  /**
   * Handles CSI Set Mode (SM) commands.
   *
   * @param buffer - TTY buffer
   * @param prefix - CSI prefix (? for private modes)
   * @param params - Mode parameters
   */
  private setMode(buffer: TTYBuffer, prefix: string, params: number[]): void {
    if (prefix === "?") {
      // Private mode set
      for (const param of params) {
        switch (param) {
          case 47: // Alternate screen buffer (basic)
            logger.debug("Switching to alternate screen buffer (mode 47)");
            buffer.useAlternateBuffer = true;
            this.ensureAlternateBufferSize(buffer);
            break;
          case 1047: // Save cursor and switch to alternate buffer
            logger.debug(
              "Saving cursor and switching to alternate screen buffer (mode 1047)",
            );
            buffer.savedCursor = { ...buffer.cursor };
            buffer.useAlternateBuffer = true;
            this.ensureAlternateBufferSize(buffer);
            break;
          case 1049: // Save cursor and screen, switch to alternate buffer
            logger.debug(
              "Saving cursor/screen and switching to alternate screen buffer (mode 1049)",
            );
            buffer.savedCursor = { ...buffer.cursor };
            buffer.useAlternateBuffer = true;
            this.ensureAlternateBufferSize(buffer);
            break;
          case 2004: // Bracketed paste mode
            // Enable bracketed paste mode (most terminals ignore this)
            break;
          case 3: // 80/132 column mode
            // Set to 132 columns (we'll ignore this)
            break;
          case 4: // Smooth scrolling
            // Set smooth scrolling (we'll ignore this)
            break;
          case 69: // Left/right margin mode
            // Set margins (we'll ignore this)
            break;
          default:
            logger.debug(`Unsupported private mode set: ${param}`);
            break;
        }
      }
    } else {
      // Standard mode set
      for (const param of params) {
        switch (param) {
          case 4: // Insert mode
            buffer.modes.insertMode = true;
            break;
          default:
            logger.debug(`Unsupported mode set: ${param}`);
            break;
        }
      }
    }
  }

  /**
   * Handles CSI p commands.
   *
   * @param buffer - TTY buffer
   * @param prefix - CSI prefix (! for soft reset)
   * @param params - Command parameters
   */
  private handlePCommand(
    buffer: TTYBuffer,
    prefix: string,
    _params: number[],
  ): void {
    if (prefix === "!") {
      // Soft terminal reset
      this.softReset(buffer);
    } else {
      logger.debug(`Unsupported p command with prefix: ${prefix}`);
    }
  }

  /**
   * Sets the scrolling region (DECSTBM).
   *
   * @param buffer - TTY buffer
   * @param params - Top and bottom lines of scroll region (1-based)
   */
  private setScrollRegion(buffer: TTYBuffer, params: number[]): void {
    const top = params[0] || 1;
    const bottom = params[1] || buffer.size.rows;

    // Validate parameters
    if (top >= 1 && bottom <= buffer.size.rows && top < bottom) {
      buffer.scrollRegion = { top, bottom };
      // Reset cursor to top-left of scroll region
      buffer.cursor.row = 0;
      buffer.cursor.col = 0;
      logger.debug(`Set scroll region: lines ${top}-${bottom}`);
    } else if (params.length === 0) {
      // No parameters means reset to full screen
      buffer.scrollRegion = null;
      buffer.cursor.row = 0;
      buffer.cursor.col = 0;
      logger.debug(`Reset scroll region to full screen`);
    } else {
      logger.debug(
        `Invalid scroll region parameters: top=${top}, bottom=${bottom}`,
      );
    }
  }

  /**
   * Scrolls content within the defined scroll region.
   *
   * @param buffer - TTY buffer
   * @param lines - Number of lines to scroll (positive = scroll up, negative = scroll down)
   */
  private scrollWithinRegion(buffer: TTYBuffer, lines: number): void {
    if (!buffer.scrollRegion) return;

    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    const scrollTop = buffer.scrollRegion.top - 1; // Convert to 0-based
    const scrollBottom = buffer.scrollRegion.bottom - 1; // Convert to 0-based

    // Calculate absolute positions in the buffer
    const absoluteScrollTop = currentBuffer.scrollTop + scrollTop;
    const absoluteScrollBottom = currentBuffer.scrollTop + scrollBottom;

    // Ensure we have enough lines in the buffer
    while (currentBuffer.lines.length <= absoluteScrollBottom) {
      currentBuffer.lines.push(createTerminalLine());
    }

    if (lines > 0) {
      // Scroll up (content moves up, new lines appear at bottom)
      for (let i = 0; i < lines; i++) {
        // Remove the top line of the scroll region
        if (absoluteScrollTop < currentBuffer.lines.length) {
          currentBuffer.lines.splice(absoluteScrollTop, 1);
        }
        // Add a new blank line at the bottom of the scroll region
        currentBuffer.lines.splice(
          absoluteScrollBottom,
          0,
          createTerminalLine(),
        );
      }
    } else if (lines < 0) {
      // Scroll down (content moves down, new lines appear at top)
      for (let i = 0; i < Math.abs(lines); i++) {
        // Remove the bottom line of the scroll region
        if (absoluteScrollBottom < currentBuffer.lines.length) {
          currentBuffer.lines.splice(absoluteScrollBottom, 1);
        }
        // Add a new blank line at the top of the scroll region
        currentBuffer.lines.splice(absoluteScrollTop, 0, createTerminalLine());
      }
    }

    logger.debug(
      `Scrolled ${lines} lines within region ${buffer.scrollRegion.top}-${buffer.scrollRegion.bottom}`,
    );
  }

  /**
   * Inserts blank lines at the current cursor position.
   * If in a scroll region, lines below are scrolled down within the region.
   *
   * @param buffer - TTY buffer
   * @param count - Number of lines to insert
   */
  private insertLines(buffer: TTYBuffer, count: number): void {
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    if (buffer.scrollRegion) {
      // Insert lines within scroll region
      const scrollTop = buffer.scrollRegion.top - 1; // Convert to 0-based
      const scrollBottom = buffer.scrollRegion.bottom - 1; // Convert to 0-based

      // Calculate absolute position where cursor is
      const absoluteCursorRow = currentBuffer.scrollTop + buffer.cursor.row;

      // Only insert if cursor is within scroll region
      if (buffer.cursor.row >= scrollTop && buffer.cursor.row <= scrollBottom) {
        // Insert blank lines at cursor position
        for (let i = 0; i < count; i++) {
          currentBuffer.lines.splice(
            absoluteCursorRow,
            0,
            createTerminalLine(),
          );
        }

        // Calculate absolute bottom of scroll region
        const absoluteScrollBottom = currentBuffer.scrollTop + scrollBottom;

        // Remove lines that were pushed past the bottom of the scroll region
        while (currentBuffer.lines.length > absoluteScrollBottom + 1) {
          currentBuffer.lines.splice(absoluteScrollBottom + 1, 1);
        }

        logger.debug(
          `Inserted ${count} lines at cursor position within scroll region`,
        );
      }
    } else {
      // Insert lines in full screen mode
      const absoluteCursorRow = currentBuffer.scrollTop + buffer.cursor.row;

      for (let i = 0; i < count; i++) {
        currentBuffer.lines.splice(absoluteCursorRow, 0, createTerminalLine());
      }

      // Remove lines that were pushed past the bottom of the screen
      const maxLines = currentBuffer.scrollTop + buffer.size.rows;
      while (currentBuffer.lines.length > maxLines) {
        currentBuffer.lines.splice(maxLines, 1);
      }

      logger.debug(`Inserted ${count} lines at cursor position`);
    }
  }

  /**
   * Deletes lines at the current cursor position.
   * If in a scroll region, lines below are scrolled up within the region.
   *
   * @param buffer - TTY buffer
   * @param count - Number of lines to delete
   */
  private deleteLines(buffer: TTYBuffer, count: number): void {
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    if (buffer.scrollRegion) {
      // Delete lines within scroll region
      const scrollTop = buffer.scrollRegion.top - 1; // Convert to 0-based
      const scrollBottom = buffer.scrollRegion.bottom - 1; // Convert to 0-based

      // Calculate absolute position where cursor is
      const absoluteCursorRow = currentBuffer.scrollTop + buffer.cursor.row;

      // Only delete if cursor is within scroll region
      if (buffer.cursor.row >= scrollTop && buffer.cursor.row <= scrollBottom) {
        // Delete lines at cursor position
        for (let i = 0; i < count; i++) {
          if (absoluteCursorRow < currentBuffer.lines.length) {
            currentBuffer.lines.splice(absoluteCursorRow, 1);
          }
        }

        // Calculate absolute bottom of scroll region
        const absoluteScrollBottom = currentBuffer.scrollTop + scrollBottom;

        // Add blank lines at the bottom of the scroll region to maintain region size
        while (currentBuffer.lines.length <= absoluteScrollBottom) {
          currentBuffer.lines.push(createTerminalLine());
        }

        logger.debug(
          `Deleted ${count} lines at cursor position within scroll region`,
        );
      }
    } else {
      // Delete lines in full screen mode
      const absoluteCursorRow = currentBuffer.scrollTop + buffer.cursor.row;

      for (let i = 0; i < count; i++) {
        if (absoluteCursorRow < currentBuffer.lines.length) {
          currentBuffer.lines.splice(absoluteCursorRow, 1);
        }
      }

      // Add blank lines at the bottom to maintain screen size
      const maxLines = currentBuffer.scrollTop + buffer.size.rows;
      while (currentBuffer.lines.length < maxLines) {
        currentBuffer.lines.push(createTerminalLine());
      }

      logger.debug(`Deleted ${count} lines at cursor position`);
    }
  }

  /**
   * Ensures the alternate buffer has a complete screen grid of lines.
   * This is needed for apps like vim that expect to be able to position
   * the cursor anywhere on the screen, including empty lines.
   *
   * @param buffer - TTY buffer
   */
  private ensureAlternateBufferSize(buffer: TTYBuffer): void {
    if (!buffer.useAlternateBuffer) return;

    const alternateBuffer = buffer.alternateBuffer;
    const requiredLines = buffer.size.rows;

    // Ensure we have enough lines for the full screen
    while (alternateBuffer.lines.length < requiredLines) {
      alternateBuffer.lines.push(createTerminalLine());
    }

    // Reset cursor to top-left when switching to alternate buffer
    buffer.cursor.row = 0;
    buffer.cursor.col = 0;

    logger.debug(
      `Ensured alternate buffer has ${requiredLines} lines for ${buffer.size.cols}x${buffer.size.rows} terminal`,
    );
  }

  /**
   * Ensures buffer has enough lines up to the specified row, creating empty lines as needed.
   * This is particularly important in alternate buffer mode where apps expect a full screen grid.
   *
   * @param buffer - TTY buffer
   * @param targetRow - The row that needs to exist (0-based absolute position)
   */
  private ensureBufferLines(buffer: TTYBuffer, targetRow: number): void {
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;

    // In alternate buffer mode, ensure we have a complete screen grid
    if (buffer.useAlternateBuffer) {
      const requiredLines = Math.max(targetRow + 1, buffer.size.rows);
      while (currentBuffer.lines.length < requiredLines) {
        currentBuffer.lines.push(createTerminalLine());
      }
    } else {
      // In primary buffer mode, only create lines as needed
      while (currentBuffer.lines.length <= targetRow) {
        currentBuffer.lines.push(createTerminalLine());
      }
    }
  }

  /**
   * Performs a soft terminal reset.
   *
   * @param buffer - TTY buffer
   */
  private softReset(buffer: TTYBuffer): void {
    // Reset cursor position
    buffer.cursor.row = 0;
    buffer.cursor.col = 0;

    // Reset scroll position
    const currentBuffer = buffer.useAlternateBuffer
      ? buffer.alternateBuffer
      : buffer.primaryBuffer;
    currentBuffer.scrollTop = 0;
    currentBuffer.lines = [];

    // Reset text attributes
    buffer.currentAttributes = createDefaultTextAttributes();

    // Reset modes
    buffer.modes.insertMode = false;
    buffer.modes.autowrap = true;

    // Reset scroll region
    buffer.scrollRegion = null;

    // Clear saved cursor
    buffer.savedCursor = undefined;

    logger.debug(`Soft reset performed for session ${buffer.sessionId}`);
  }
}

/**
 * Factory function to create a TTY service.
 *
 * @returns New TTY service instance
 */
export function createTTYService(): ITTYService {
  return new TTYService();
}
