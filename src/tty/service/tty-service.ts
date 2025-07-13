/**
 * TTY service for processing terminal text output with enhanced line ending handling.
 */

import {
  createTTYAppendResult,
  createTTYBufferState,
  DEFAULT_TTY_BUFFER_CONFIG,
  type TTYAppendResult,
  type TTYBufferConfig,
  type TTYBufferState,
} from "../models/tty-buffer-model.ts";
import {
  LineEndingType,
  type ParsedLine,
} from "../models/tty-line-ending-model.ts";
import { parseLineEndings } from "../utils/line-ending-utils.ts";
import { logger } from "../../logger/logger.ts";

/**
 * Interface for TTY service operations.
 */
export interface ITTYService {
  /**
   * Appends output text to a buffer with proper line ending handling.
   *
   * @param buffer - Current buffer lines
   * @param output - Text output to append
   * @param config - Buffer configuration
   * @returns Result containing updated buffer and metadata
   */
  appendOutput(
    buffer: string[],
    output: string,
    config?: TTYBufferConfig,
  ): TTYAppendResult;

  /**
   * Creates a new TTY buffer state.
   *
   * @param config - Optional buffer configuration
   * @returns New TTY buffer state
   */
  createBufferState(config?: Partial<TTYBufferConfig>): TTYBufferState;
}

/**
 * Service for processing TTY text output with enhanced line ending support.
 * Handles carriage returns, line feeds, and mixed line endings properly.
 */
export class TTYService implements ITTYService {
  /**
   * Creates a new TTY service instance.
   */
  constructor() {
    logger.debug("TTYService initialized");
  }

  appendOutput(
    buffer: string[],
    output: string,
    config: TTYBufferConfig = DEFAULT_TTY_BUFFER_CONFIG,
  ): TTYAppendResult {
    try {
      logger.debug(`Appending TTY output: ${output.length} characters`);

      // Parse the output into structured lines
      const parseResult = parseLineEndings(output);
      const workingBuffer = [...buffer];

      // Process each parsed line
      for (let i = 0; i < parseResult.lines.length; i++) {
        const parsedLine = parseResult.lines[i];
        this.processLine(workingBuffer, parsedLine, i === 0);
      }

      // Handle any remaining text that doesn't end with a line terminator
      if (parseResult.remainder) {
        // Check if the last processed line was a carriage return overwrite
        const lastLineWasCarriageReturn = parseResult.lines.length > 0 &&
          parseResult.lines[parseResult.lines.length - 1].shouldOverwrite;

        if (lastLineWasCarriageReturn && workingBuffer.length > 0) {
          // If the last line was a carriage return, the remainder should overwrite that line
          const lastIndex = workingBuffer.length - 1;
          workingBuffer[lastIndex] = parseResult.remainder;
          logger.debug(
            `Carriage return remainder overwrite: "${parseResult.remainder}"`,
          );
        } else if (parseResult.lines.length > 0) {
          // If there are parsed lines, remainder goes on a new line
          workingBuffer.push(parseResult.remainder);
        } else {
          // If there are no parsed lines, append to the last line in buffer
          this.appendToLastLine(workingBuffer, parseResult.remainder);
        }
      }

      // Trim buffer if it exceeds max lines
      const trimResult = this.trimBuffer(workingBuffer, config.maxBufferLines);

      logger.debug(
        `TTY append complete: ${trimResult.updatedBuffer.length} lines in buffer`,
      );

      return trimResult;
    } catch (error) {
      logger.error("Error appending TTY output:", error);
      // Return original buffer on error to avoid data loss
      return createTTYAppendResult([...buffer], false, 0);
    }
  }

  createBufferState(config: Partial<TTYBufferConfig> = {}): TTYBufferState {
    return createTTYBufferState(config);
  }

  /**
   * Processes a single parsed line and updates the buffer accordingly.
   *
   * @param buffer - The working buffer to modify
   * @param parsedLine - The parsed line to process
   * @param isFirstLine - Whether this is the first line being processed
   */
  private processLine(
    buffer: string[],
    parsedLine: ParsedLine,
    isFirstLine: boolean,
  ): void {
    if (parsedLine.shouldOverwrite && buffer.length > 0) {
      // Carriage return: overwrite the last line
      const lastIndex = buffer.length - 1;
      buffer[lastIndex] = parsedLine.content;
      logger.debug(`Overwrote line ${lastIndex} with carriage return`);
    } else if (isFirstLine && buffer.length > 0) {
      // First line: append to the existing last line
      const lastIndex = buffer.length - 1;
      buffer[lastIndex] += parsedLine.content;
      logger.debug(`Appended to existing line ${lastIndex}`);
    } else {
      // New line: add to buffer
      buffer.push(parsedLine.content);
      logger.debug(`Added new line: "${parsedLine.content}"`);
    }
  }

  /**
   * Appends text to the last line in the buffer.
   *
   * @param buffer - The buffer to modify
   * @param text - The text to append
   */
  private appendToLastLine(buffer: string[], text: string): void {
    if (buffer.length === 0) {
      buffer.push(text);
    } else {
      const lastIndex = buffer.length - 1;
      buffer[lastIndex] += text;
    }
    logger.debug(`Appended remainder to last line: "${text}"`);
  }

  /**
   * Trims buffer to maximum allowed lines.
   *
   * @param buffer - The buffer to trim
   * @param maxLines - Maximum number of lines to keep
   * @returns TTY append result with trim information
   */
  private trimBuffer(buffer: string[], maxLines: number): TTYAppendResult {
    if (buffer.length <= maxLines) {
      return createTTYAppendResult(buffer, false, 0);
    }

    const excessLines = buffer.length - maxLines;
    const trimmedBuffer = buffer.slice(excessLines);

    logger.debug(`Trimmed ${excessLines} lines from buffer`);

    return createTTYAppendResult(trimmedBuffer, true, excessLines);
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
