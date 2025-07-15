/**
 * Terminal line component for rendering individual terminal lines with character-level attributes.
 */

import React from "react";
import { Box, Text } from "ink";
import type { TTYBuffer } from "../../tty/models/tty-buffer-model.ts";
import { convertColorCode } from "../../tty/utils/color-utils.ts";

interface TerminalLineProps {
  /** The line text content */
  lineText: string;
  /** The actual buffer line index (-1 for empty lines) */
  bufferLineIndex: number;
  /** TTY buffer for accessing character attributes */
  ttyBuffer: TTYBuffer;
  /** Whether to show cursor on this line */
  showCursor?: boolean;
  /** Whether this line should be highlighted as focused */
  isFocused?: boolean;
}

/**
 * Helper function to get the current buffer from TTY buffer.
 */
function getCurrentBuffer(ttyBuffer: TTYBuffer) {
  return ttyBuffer.useAlternateBuffer
    ? ttyBuffer.alternateBuffer
    : ttyBuffer.primaryBuffer;
}

/**
 * Helper function to check if cursor should be shown on this line.
 */
function shouldShowCursor(
  showCursor: boolean,
  ttyBuffer: TTYBuffer,
  bufferLineIndex: number,
): boolean {
  return showCursor &&
    ttyBuffer.cursor.visible &&
    bufferLineIndex === ttyBuffer.cursor.row;
}

/**
 * Renders a terminal line with character-level attributes and optional cursor.
 */
export const TerminalLine: React.FC<TerminalLineProps> = ({
  lineText,
  bufferLineIndex,
  ttyBuffer,
  showCursor = false,
  isFocused = false,
}) => {
  // Handle empty lines or invalid buffer indices
  if (bufferLineIndex === -1 || !ttyBuffer) {
    return <Text>{lineText}</Text>;
  }

  const currentBuffer = getCurrentBuffer(ttyBuffer);
  const lineData = currentBuffer.lines[bufferLineIndex];

  // Fallback to plain text if no detailed character data
  if (!lineData || !lineData.characters.length) {
    return <Text>{lineText}</Text>;
  }

  // Render each character with its individual attributes
  const renderedChars = lineData.characters.map((termChar, charIndex) => {
    const color = convertColorCode(termChar.attributes.foregroundColor);
    const backgroundColor = convertColorCode(termChar.attributes.backgroundColor);

    return (
      <Text
        color={color}
        backgroundColor={backgroundColor}
        bold={termChar.attributes.bold}
        italic={termChar.attributes.italic}
        underline={termChar.attributes.underline}
        strikethrough={termChar.attributes.strikethrough}
        inverse={termChar.attributes.reverse}
        dimColor={termChar.attributes.dim}
      >
        {termChar.char}
      </Text>
    );
  });

  // Add cursor if this is the cursor line and cursor is visible
  if (shouldShowCursor(showCursor, ttyBuffer, bufferLineIndex)) {
    const cursorPos = ttyBuffer.cursor.col;

    // Insert cursor at the appropriate position
    if (cursorPos < renderedChars.length) {
      renderedChars.splice(
        cursorPos,
        0,
        <Text backgroundColor="white" color="black">
          {" "}
        </Text>,
      );
    } else {
      // Cursor at end of line
      renderedChars.push(
        <Text backgroundColor="white" color="black">
          {" "}
        </Text>,
      );
    }
  }

  return (
    <Box flexDirection="row">
      {renderedChars}
    </Box>
  );
};
