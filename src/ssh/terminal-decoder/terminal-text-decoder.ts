import {
  ALL_ANSI_PATTERN,
  extractIncompleteSequence,
} from "./ansi-patterns.ts";
import { logger } from "../../logger/logger.ts";

/**
 * Interface for terminal text decoding operations.
 */
export interface ITerminalTextDecoder {
  /**
   * Decodes terminal text by stripping ANSI escape sequences.
   *
   * @param text - The raw terminal text containing ANSI sequences
   * @returns Clean text with ANSI sequences removed
   */
  decode(text: string): string;
}

/**
 * Decoder for terminal text that strips ANSI escape sequences.
 * Handles streaming input with state management for partial sequences.
 */
export class TerminalTextDecoder implements ITerminalTextDecoder {
  private buffer = "";

  /**
   * Creates a new terminal text decoder instance.
   */
  constructor() {
    logger.debug("TerminalTextDecoder initialized");
  }

  /**
   * Decodes terminal text by stripping ANSI escape sequences.
   * Maintains state to handle partial sequences across multiple calls.
   *
   * @param text - The raw terminal text containing ANSI sequences
   * @returns Clean text with ANSI sequences removed
   */
  decode(text: string): string {
    try {
      // Combine any buffered incomplete sequence with new text
      const fullText = this.buffer + text;
      this.buffer = "";

      // Check for incomplete sequence at the end
      const incompleteSequence = extractIncompleteSequence(fullText);

      let textToProcess = fullText;
      if (incompleteSequence) {
        // Buffer the incomplete sequence for the next call
        this.buffer = incompleteSequence;
        textToProcess = fullText.slice(0, -incompleteSequence.length);
      }

      // Strip all ANSI escape sequences
      const cleanText = this.stripAnsiSequences(textToProcess);

      return cleanText;
    } catch (error) {
      logger.error("Error decoding terminal text:", error);
      // Return original text on error to avoid data loss
      return text;
    }
  }

  /**
   * Strips ANSI escape sequences from text using comprehensive pattern matching.
   *
   * @param text - The text to clean
   * @returns Text with ANSI sequences removed
   */
  private stripAnsiSequences(text: string): string {
    // Reset the global regex to ensure consistent behavior
    ALL_ANSI_PATTERN.lastIndex = 0;

    return text.replace(ALL_ANSI_PATTERN, "");
  }

  /**
   * Gets the current buffer content (for debugging/testing).
   *
   * @returns The buffered incomplete sequence
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Clears the internal buffer (useful for reset scenarios).
   */
  clearBuffer(): void {
    this.buffer = "";
    logger.debug("TerminalTextDecoder buffer cleared");
  }
}

/**
 * Factory function to create a terminal text decoder.
 *
 * @returns New terminal text decoder instance
 */
export function createTerminalTextDecoder(): ITerminalTextDecoder {
  return new TerminalTextDecoder();
}
