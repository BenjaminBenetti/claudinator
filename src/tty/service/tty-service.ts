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

      // Determine if we should append to last line based on input characteristics
      // Heuristic: if input starts with whitespace (but not shell prompts), likely a continuation
      const shouldAppendToLastLine = /^[\s]/.test(output) &&
        !/^[\s]*[$#>]/.test(output);

      // Handle carriage return chains: if we have consecutive CR lines, compress them
      let currentOverwriteTarget = -1; // Index of line to overwrite, -1 means add new
      let skippedFirstEmptyLine = false; // Track if we skip first empty line to adjust subsequent processing

      for (let i = 0; i < parseResult.lines.length; i++) {
        const parsedLine = parseResult.lines[i];

        if (parsedLine.shouldOverwrite) {
          if (currentOverwriteTarget === -1) {
            // First carriage return: determine what to overwrite
            if (i === 0 && workingBuffer.length > 0) {
              // First line and buffer exists: overwrite last line
              currentOverwriteTarget = workingBuffer.length - 1;
            } else {
              // Add new line and mark it for overwrite
              workingBuffer.push("");
              currentOverwriteTarget = workingBuffer.length - 1;
            }
          }
          // Update the overwrite target with this content
          workingBuffer[currentOverwriteTarget] = parsedLine.content;
          logger.debug(
            `CR overwrite: set line ${currentOverwriteTarget} to "${parsedLine.content}"`,
          );
        } else {
          // Non-carriage return: process normally
          const isLastLine = i === parseResult.lines.length - 1;
          const hasRemainder =
            !!(parseResult.remainder && parseResult.remainder.length > 0);

          // Special case: if this is the first line, it's empty, and buffer ends with empty line,
          // don't create another empty line (this handles leading \r\n properly)
          const isFirstEmptyLineWithEmptyBufferEnd = i === 0 &&
            parsedLine.content === "" &&
            workingBuffer.length > 0 &&
            workingBuffer[workingBuffer.length - 1] === "";

          if (!isFirstEmptyLineWithEmptyBufferEnd) {
            // Adjust isFirstLine based on whether we skipped the first empty line
            const effectiveIsFirstLine = skippedFirstEmptyLine
              ? false
              : (i === 0);
            this.processLine(
              workingBuffer,
              parsedLine,
              effectiveIsFirstLine,
              shouldAppendToLastLine,
              isLastLine,
              hasRemainder,
            );
          } else {
            logger.debug(
              `Skipped processing empty first line - buffer already ends with empty line`,
            );
            skippedFirstEmptyLine = true;
            // Since we skipped the first empty line, the next line should NOT be treated as first line
            // and should use the existing empty line at the end of buffer
          }
          currentOverwriteTarget = -1; // Reset overwrite target
        }
      }

      // Handle any remaining text that doesn't end with a line terminator
      if (parseResult.remainder && parseResult.remainder.length > 0) {
        // Check if we're in a carriage return chain
        const lastLineWasCarriageReturn = parseResult.lines.length > 0 &&
          parseResult.lines[parseResult.lines.length - 1].shouldOverwrite;

        if (lastLineWasCarriageReturn && currentOverwriteTarget >= 0) {
          // Continue the carriage return chain with remainder
          workingBuffer[currentOverwriteTarget] = parseResult.remainder;
          logger.debug(
            `CR chain remainder: set line ${currentOverwriteTarget} to "${parseResult.remainder}"`,
          );
        } else if (parseResult.lines.length > 0) {
          // If there are parsed lines, check if last line is empty (from line ending)
          const lastLine = workingBuffer[workingBuffer.length - 1];
          if (lastLine === "") {
            // Remainder goes into the empty line created by line ending
            workingBuffer[workingBuffer.length - 1] = parseResult.remainder;
            logger.debug(
              `Remainder filled empty line: "${parseResult.remainder}"`,
            );
          } else {
            // Otherwise, remainder goes on a new line
            workingBuffer.push(parseResult.remainder);
            logger.debug(
              `Remainder added as new line: "${parseResult.remainder}"`,
            );
          }
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
   * @param shouldAppendToLastLine - Whether to append to the last line vs create new line
   * @param isLastLine - Whether this is the last line being processed
   * @param hasRemainder - Whether there is remainder text after this line
   */
  private processLine(
    buffer: string[],
    parsedLine: ParsedLine,
    isFirstLine: boolean,
    shouldAppendToLastLine: boolean,
    isLastLine: boolean,
    hasRemainder: boolean,
  ): void {
    if (isFirstLine && buffer.length > 0 && shouldAppendToLastLine) {
      // First line that should continue the existing last line
      const lastIndex = buffer.length - 1;
      buffer[lastIndex] += parsedLine.content;
      logger.debug(
        `Appended to existing line ${lastIndex}: "${parsedLine.content}"`,
      );
    } else {
      // Add as new line
      buffer.push(parsedLine.content);
      logger.debug(`Added new line: "${parsedLine.content}"`);
    }

    // If this line had a line ending and it's the last line with no remainder, create a new empty line
    // This ensures that terminal sessions with trailing newlines get proper line separation
    // BUT only for LF and CRLF endings, not CR (carriage returns should not create new lines)
    // AND only if we don't already have too many consecutive empty lines at the end
    if (
      (parsedLine.endingType === LineEndingType.LF ||
        parsedLine.endingType === LineEndingType.CRLF) &&
      isLastLine && !hasRemainder
    ) {
      // Count consecutive empty lines at the end of buffer
      let emptyLinesAtEnd = 0;
      for (let i = buffer.length - 1; i >= 0 && buffer[i] === ""; i--) {
        emptyLinesAtEnd++;
      }

      // Only create new empty line if we have fewer than 2 empty lines at the end
      if (emptyLinesAtEnd < 2) {
        buffer.push("");
        logger.debug(
          `Created new line due to trailing line ending: ${parsedLine.endingType}`,
        );
      } else {
        logger.debug(
          `Skipped creating empty line - already have ${emptyLinesAtEnd} empty lines at end`,
        );
      }
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
