/**
 * TTY buffer domain models for managing terminal text buffer state and operations.
 */

/**
 * Represents the result of appending text to a TTY buffer.
 */
export interface TTYAppendResult {
  /** The updated buffer lines */
  updatedBuffer: string[];
  /** Whether the buffer was trimmed due to size limits */
  wasTrimmed: boolean;
  /** Number of lines removed if trimmed */
  linesRemoved: number;
}

/**
 * Configuration for TTY buffer behavior.
 */
export interface TTYBufferConfig {
  /** Maximum number of lines to keep in buffer */
  maxBufferLines: number;
  /** Whether to handle carriage returns as line overwrites */
  handleCarriageReturn: boolean;
}

/**
 * State tracking for TTY buffer operations.
 */
export interface TTYBufferState {
  /** Current buffer lines */
  buffer: string[];
  /** Configuration for buffer behavior */
  config: TTYBufferConfig;
}

/**
 * Default TTY buffer configuration.
 */
export const DEFAULT_TTY_BUFFER_CONFIG: TTYBufferConfig = {
  maxBufferLines: 1000,
  handleCarriageReturn: true,
};

/**
 * Creates a new TTY buffer state with default configuration.
 *
 * @param config - Optional buffer configuration
 * @returns A new TTYBufferState instance
 */
export function createTTYBufferState(
  config: Partial<TTYBufferConfig> = {},
): TTYBufferState {
  return {
    buffer: [],
    config: { ...DEFAULT_TTY_BUFFER_CONFIG, ...config },
  };
}

/**
 * Creates an append result instance.
 *
 * @param updatedBuffer - The updated buffer lines
 * @param wasTrimmed - Whether the buffer was trimmed
 * @param linesRemoved - Number of lines removed if trimmed
 * @returns A new TTYAppendResult instance
 */
export function createTTYAppendResult(
  updatedBuffer: string[],
  wasTrimmed = false,
  linesRemoved = 0,
): TTYAppendResult {
  return {
    updatedBuffer,
    wasTrimmed,
    linesRemoved,
  };
}
