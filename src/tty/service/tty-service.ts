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
  getVisibleLinesWithIndices(sessionId: string): Array<{ lineIndex: number; lineText: string }>;

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
  getVisibleLinesWithIndices(sessionId: string): Array<{ lineIndex: number; lineText: string }> {
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

    // If we're past the bottom of the screen, scroll
    if (buffer.cursor.row >= buffer.size.rows) {
      // Calculate absolute position where new line should be added
      const absoluteRow = currentBuffer.scrollTop + buffer.cursor.row;
      
      // Ensure we have enough lines up to this position
      while (currentBuffer.lines.length <= absoluteRow) {
        currentBuffer.lines.push(createTerminalLine());
      }

      // Move cursor back to bottom of visible area
      buffer.cursor.row = buffer.size.rows - 1;
      
      // Scroll down by one line to show new content
      currentBuffer.scrollTop++;

      // Trim buffer if it's too large
      if (currentBuffer.lines.length > currentBuffer.maxLines) {
        const removeCount = currentBuffer.lines.length -
          BUFFER_LIMITS.TRIM_TO_LINES;
        currentBuffer.lines.splice(0, removeCount);
        currentBuffer.scrolledOffLines += removeCount;
        currentBuffer.scrollTop = Math.max(0, currentBuffer.scrollTop - removeCount);
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
    const match = sequence.match(/^\x1b\[([?!]?)([0-9;:]*)([A-Za-z])/);
    if (!match) {
      logger.debug(`Invalid CSI sequence: ${sequence}`);
      return;
    }

    const prefix = match[1];
    const paramsStr = match[2];
    const command = match[3];
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
          buffer.cursor = { ...buffer.savedCursor };
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

    // Cursor position is relative to the visible area (not absolute buffer position)
    buffer.cursor.row = row;
    buffer.cursor.col = col;
  }

  /**
   * Sets cursor column from CSI G command (Cursor Horizontal Absolute).
   *
   * @param buffer - TTY buffer to update
   * @param column - Column position (1-based)
   */
  private setCursorColumn(buffer: TTYBuffer, column: number): void {
    const col = Math.max(0, column - 1); // Convert from 1-based to 0-based
    buffer.cursor.col = col;
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

    buffer.cursor.col = Math.max(
      0,
      Math.min(
        buffer.size.cols - 1,
        buffer.cursor.col + deltaCol,
      ),
    );
    
    buffer.cursor.row = Math.max(0, buffer.cursor.row + deltaRow);

    // Only adjust scroll if cursor moves below the visible area (normal terminal behavior)
    // Don't auto-scroll when cursor moves above - let content stay where it was written
    if (buffer.cursor.row >= buffer.size.rows) {
      // Cursor moved below visible area - scroll down to follow
      const absoluteCursorRow = currentBuffer.scrollTop + buffer.cursor.row;
      currentBuffer.scrollTop = Math.max(0, absoluteCursorRow - buffer.size.rows + 1);
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
  private handlePCommand(buffer: TTYBuffer, prefix: string, _params: number[]): void {
    if (prefix === "!") {
      // Soft terminal reset
      this.softReset(buffer);
    } else {
      logger.debug(`Unsupported p command with prefix: ${prefix}`);
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
