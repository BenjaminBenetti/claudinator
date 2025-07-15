import React, { useMemo } from "react";
import { Box, Text } from "ink";
import type { ITTYService } from "../../tty/service/tty-service.ts";
import { TerminalLine } from "./terminal-line.tsx";
import { logger } from "../../logger/logger.ts";

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

  // Get visible lines with indices from TTY service
  const visibleLines = useMemo(() => {
    if (!ttyBuffer) return [];

    try {
      const lines = ttyService.getVisibleLinesWithIndices(sessionId);

      logger.debug(`Visible lines for session ${sessionId}: ${lines.length}`);
      logger.debug(`Visible lines: ${lines.map(l => l.lineText).join("\n")}`);

      return lines;
    } catch (error) {
      console.error("Failed to get visible lines:", error);
      return [];
    }
  }, [ttyService, sessionId, ttyBuffer, ttyBuffer?.lastUpdated, maxLines]);

  // Helper function to render empty state
  const renderEmptyState = () => (
    <Text color="gray" dimColor>
      {isFocused
        ? "Terminal ready - waiting for output..."
        : "No output"}
    </Text>
  );

  // Helper function to render terminal content
  const renderTerminalContent = () => {
    if (visibleLines.length === 0) {
      return renderEmptyState();
    }

    return visibleLines.map((line: { lineIndex: number; lineText: string }, index: number) => (
      <React.Fragment key={index}>
        <TerminalLine
          lineText={line.lineText}
          bufferLineIndex={line.lineIndex}
          ttyBuffer={ttyBuffer!}
          showCursor={showCursor}
          isFocused={isFocused}
        />
      </React.Fragment>
    ));
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
        {renderTerminalContent()}
      </Box>
    </Box>
  );
};
