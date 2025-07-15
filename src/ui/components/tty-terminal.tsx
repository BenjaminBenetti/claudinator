import React, { useMemo } from "react";
import { Box, Text } from "ink";
import type { ITTYService } from "../../tty/service/tty-service.ts";
import type { TTYBuffer } from "../../tty/models/tty-buffer-model.ts";
import { BASIC_COLORS } from "../../tty/models/ansi-sequence-model.ts";

/**
 * Props for the TTY Terminal component.
 */
export interface TTYTerminalProps {
  /** TTY service instance for accessing terminal data */
  ttyService: ITTYService;
  /** Session ID for the terminal session */
  sessionId: string;
  /** Whether to show the cursor */
  showCursor?: boolean;
  /** Maximum number of lines to display */
  maxLines?: number;
  /** Whether the terminal is focused */
  isFocused?: boolean;
  /** Optional custom width override */
  width?: number;
  /** Optional custom height override */
  height?: number;
  /** Whether to enable scrolling */
  enableScrolling?: boolean;
}

/**
 * Converts a color code to an Ink-compatible color string.
 *
 * @param colorCode - ANSI color code (0-7 for basic colors)
 * @returns Ink color string or undefined for default
 */
function convertColorCode(colorCode: number | undefined): string | undefined {
  if (colorCode === undefined) return undefined;

  switch (colorCode) {
    case BASIC_COLORS.BLACK:
      return "black";
    case BASIC_COLORS.RED:
      return "red";
    case BASIC_COLORS.GREEN:
      return "green";
    case BASIC_COLORS.YELLOW:
      return "yellow";
    case BASIC_COLORS.BLUE:
      return "blue";
    case BASIC_COLORS.MAGENTA:
      return "magenta";
    case BASIC_COLORS.CYAN:
      return "cyan";
    case BASIC_COLORS.WHITE:
      return "white";
    default:
      return undefined;
  }
}

/**
 * TTY Terminal component that renders terminal output with enhanced ANSI support.
 *
 * This component leverages the TTY service to display terminal content with:
 * - Proper ANSI escape sequence processing
 * - Color and text formatting support
 * - Cursor positioning and display
 * - Character-level attribute handling
 */
export const TTYTerminal: React.FC<TTYTerminalProps> = ({
  ttyService,
  sessionId,
  showCursor = false,
  maxLines,
  isFocused = false,
  width,
  height,
  enableScrolling = true,
}: TTYTerminalProps) => {
  // Get the TTY buffer for this session
  const ttyBuffer = useMemo(() => {
    return ttyService.getTTYBuffer(sessionId);
  }, [ttyService, sessionId]);

  // Get visible lines using TTY service
  const visibleLines = useMemo(() => {
    if (!ttyBuffer) return [];

    try {
      const lines = ttyService.getVisibleLines(sessionId);

      // Apply maxLines limit if specified
      if (maxLines && lines.length > maxLines) {
        return lines.slice(-maxLines);
      }

      return lines;
    } catch (error) {
      console.error("Failed to get visible lines:", error);
      return [];
    }
  }, [ttyService, sessionId, ttyBuffer, maxLines]);

  // Get terminal buffer for detailed character rendering
  const terminalBuffer = useMemo(() => {
    return ttyBuffer;
  }, [ttyBuffer]);

  // Render individual characters with their attributes
  const renderLineWithAttributes = (lineIndex: number, lineText: string) => {
    if (!terminalBuffer) {
      return <Text>{lineText}</Text>;
    }

    const currentBuffer = terminalBuffer.useAlternateBuffer
      ? terminalBuffer.alternateBuffer
      : terminalBuffer.primaryBuffer;

    // Check if we have detailed character data for this line
    const lineData = currentBuffer.lines[lineIndex];
    if (!lineData || !lineData.characters.length) {
      return <Text>{lineText}</Text>;
    }

    // Render each character with its individual attributes
    const renderedChars = lineData.characters.map((termChar, charIndex) => {
      const color = convertColorCode(termChar.attributes.foregroundColor);
      const backgroundColor = convertColorCode(
        termChar.attributes.backgroundColor,
      );

      return (
        <React.Fragment key={charIndex}>
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
        </React.Fragment>
      );
    });

    // Add cursor if this is the cursor line and cursor is visible
    if (
      showCursor &&
      terminalBuffer.cursor.visible &&
      lineIndex === terminalBuffer.cursor.row
    ) {
      // Insert cursor at the appropriate position
      const cursorPos = terminalBuffer.cursor.col;

      if (cursorPos < renderedChars.length) {
        // Replace character at cursor position with highlighted version
        renderedChars[cursorPos] = (
          <Text
            color="black"
            backgroundColor="white"
            bold={lineData.characters[cursorPos]?.attributes.bold}
          >
            {lineData.characters[cursorPos]?.char || " "}
          </Text>
        );
      } else {
        // Add cursor at end of line
        renderedChars.push(
          <Text color="black" backgroundColor="white"></Text>,
        );
      }
    }

    return (
      <Box flexDirection="row">
        {renderedChars}
      </Box>
    );
  };

  // If no TTY buffer exists, show error
  if (!ttyBuffer) {
    return (
      <Box flexDirection="column" width={width} height={height}>
        <Text color="red">TTY session not found: {sessionId}</Text>
        <Text color="gray" dimColor>
          The terminal session may not have been initialized
        </Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      width={width || "100%"}
      height={height || "100%"}
      overflow={enableScrolling ? "hidden" : undefined}
    >
      {/* Terminal content */}
      <Box flexGrow={1} flexDirection="column">
        {visibleLines.length > 0
          ? (
            visibleLines.map((line, index) => {
              // Try to render with attributes if we have detailed buffer data
              return (
                <React.Fragment key={index}>
                  {renderLineWithAttributes(index, line)}
                </React.Fragment>
              );
            })
          )
          : (
            <Text color="gray" dimColor>
              {isFocused
                ? "Terminal ready - waiting for output..."
                : "No output"}
            </Text>
          )}
      </Box>

      {/* Debug info (only show if focused and in development) */}
      {isFocused && Deno.env.get("NODE_ENV") === "development" && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Buffer: {ttyBuffer.size.cols}x{ttyBuffer.size.rows}{" "}
            | Cursor: ({ttyBuffer.cursor.col}, {ttyBuffer.cursor.row}) | Lines:
            {" "}
            {visibleLines.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};
