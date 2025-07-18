import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import type {
  SSHSession,
  SSHSessionStatus,
} from "../../../ssh/models/ssh-session-model.ts";
import type { TerminalState } from "../../../ssh/models/terminal-state-model.ts";
import type { ISSHConnectionService } from "../../../ssh/service/ssh-connection-service.ts";
import { SSHConnectionError } from "../../../ssh/service/ssh-connection-service.ts";
import type { ITerminalService } from "../../../ssh/service/terminal-service.ts";
import { TTYTerminal } from "./tty-terminal.tsx";
import { logger } from "../../../logger/logger.ts";

/**
 * Props for the Terminal component.
 */
export interface TerminalProps {
  /** Agent ID for the terminal session */
  agentId: string;
  /** Codespace ID to connect to */
  codespaceId: string;
  /** Display name for the codespace */
  codespaceDisplayName?: string;
  /** Whether the terminal is focused and should receive input */
  isFocused?: boolean;
  /** SSH connection service instance */
  sshConnectionService: ISSHConnectionService;
  /** Terminal service instance */
  terminalService: ITerminalService;
  /** Number of tiles for size calculation */
  tileCount?: number;
  /** Optional width override */
  width?: string | number;
  /** Optional height override */
  height?: string | number;
  /** Callback when remote session is terminated */
  onSessionTerminated?: () => void;
}

/**
 * Terminal component that handles SSH connections, input forwarding,
 * and terminal display with proper size management.
 *
 * This component encapsulates all terminal-related operations including:
 * - SSH connection management
 * - Terminal size calculation and resizing
 * - Input handling and keystroke forwarding
 * - Connection status management
 * - Terminal state lifecycle
 */
export const Terminal: React.FC<TerminalProps> = ({
  agentId,
  codespaceId,
  codespaceDisplayName,
  isFocused = false,
  sshConnectionService,
  terminalService,
  tileCount = 1,
  width = "100%",
  height = "100%",
  onSessionTerminated,
}: TerminalProps) => {
  const [sshSession, setSSHSession] = useState<SSHSession | undefined>();
  const [terminalState, setTerminalState] = useState<
    TerminalState | undefined
  >();
  const [connectionStatus, setConnectionStatus] = useState<SSHSessionStatus>(
    "connecting",
  );
  const [error, setError] = useState<string | undefined>();

  // Track initialization state to prevent multiple initializations
  const isInitializedRef = useRef(false);
  const hasReceivedOutputRef = useRef(false);

  // Get actual terminal dimensions
  const { stdout } = useStdout();

  /**
   * Calculate terminal dimensions based on actual available space and tile configuration.
   * @returns Terminal size object with cols and rows
   */
  const terminalSize = useMemo(() => {
    // Calculate container width (same as TileContainer)
    const containerWidth = stdout.columns - 27; // Account for sidebar width
    const containerHeight = stdout.rows - 3; // Account for help bar height

    // Calculate tile width based on tile count (same logic as TileContainer)
    let tileWidth: number;
    if (tileCount === 1) {
      tileWidth = containerWidth - 2; // Container padding
    } else if (tileCount === 2) {
      const availableWidth = containerWidth - 2 - 4 - 1; // Container padding, tile borders, margin
      tileWidth = Math.floor(availableWidth / 2);
    } else {
      // For more than 2 tiles, use grid layout calculation
      const columns = Math.ceil(Math.sqrt(tileCount));
      const horizontalOverhead = 2 + (columns * 2) + (columns - 1);
      const availableWidth = containerWidth - horizontalOverhead;
      tileWidth = Math.floor(availableWidth / columns);
    }

    // Account for tile internal padding and borders
    const availableWidth = Math.max(20, tileWidth - 4); // Tile padding and borders
    const availableHeight = Math.max(5, containerHeight - 6); // Status bar and padding

    return {
      cols: availableWidth,
      rows: availableHeight,
    };
  }, [stdout.columns, stdout.rows, tileCount]);

  /**
   * Initialize SSH connection and terminal state.
   */
  const initializeConnection = async () => {
    try {
      isInitializedRef.current = true;
      setConnectionStatus("connecting");
      setError(undefined);

      // Use the memoized terminal size
      const session = await sshConnectionService.connectToCodespace(
        agentId,
        codespaceId,
        terminalSize,
      );

      setSSHSession(session);
      setConnectionStatus(session.status);

      const termState = terminalService.createTerminalState(
        session.id,
        sshConnectionService,
        terminalSize,
        (_sessionId, updatedState) => {
          // Check if this is the first output received
          if (
            !hasReceivedOutputRef.current &&
            updatedState.outputBuffer.length > 0
          ) {
            hasReceivedOutputRef.current = true;

            // Send resize command after first output is received
            setTimeout(async () => {
              try {
                await sshConnectionService.resizeTerminal(
                  session.id,
                  terminalSize,
                );

                // Also send explicit stty command to ensure remote terminal width is set
                setTimeout(async () => {
                  try {
                    const sttyCommand =
                      `stty cols ${terminalSize.cols} rows ${terminalSize.rows}\r`;
                    await sshConnectionService.sendKeystroke(
                      session.id,
                      sttyCommand,
                    );
                    logger.info(
                      `Sent stty command to set terminal size: ${terminalSize.cols}x${terminalSize.rows}`,
                    );

                    // Check what the remote terminal actually thinks its width is
                    setTimeout(async () => {
                      try {
                        const checkCommand =
                          `echo "TERM_WIDTH: $(tput cols)"\r`;
                        await sshConnectionService.sendKeystroke(
                          session.id,
                          checkCommand,
                        );
                        logger.info(
                          "Sent command to check remote terminal width",
                        );
                      } catch (checkErr) {
                        if (
                          checkErr instanceof SSHConnectionError &&
                          checkErr.message.includes(
                            "No input stream for session",
                          )
                        ) {
                          logger.info(
                            "Session terminated during terminal check, ignoring",
                          );
                        } else {
                          logger.warn("Failed to send tput command:", checkErr);
                        }
                      }
                    }, 100);
                  } catch (sttyErr) {
                    if (
                      sttyErr instanceof SSHConnectionError &&
                      sttyErr.message.includes("No input stream for session")
                    ) {
                      logger.info(
                        "Session terminated during stty command, ignoring",
                      );
                    } else {
                      logger.warn("Failed to send stty command:", sttyErr);
                    }
                  }
                }, 200); // Additional delay for stty command

                logger.info(
                  `Terminal resized after first output to ${terminalSize.cols}x${terminalSize.rows}`,
                );
              } catch (err) {
                logger.warn(
                  "Failed to resize terminal after first output:",
                  err,
                );
              }
            }, 100); // Small delay to ensure output processing is complete
          }

          // Callback for when terminal state changes - force new object reference
          setTerminalState((_prev: TerminalState | undefined) => ({
            ...updatedState,
            // Force React to detect the change by including a timestamp
            lastUpdated: Date.now(),
          }));
        },
      );
      setTerminalState(termState);
    } catch (err) {
      console.error("Failed to initialize SSH connection:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnectionStatus("error");
      isInitializedRef.current = false; // Reset on error to allow retry
    }
  };

  // Initialize SSH connection when component mounts (only once)
  useEffect(() => {
    // Only initialize if we haven't already initialized
    if (isInitializedRef.current) {
      return;
    }

    initializeConnection();
    logger.info("Terminal Connected");
  }, []); // Empty dependency array - only run once on mount

  // Handle terminal size changes (for actual resizing, not initial connection)
  useEffect(() => {
    if (
      sshSession && terminalService && sshConnectionService &&
      hasReceivedOutputRef.current && connectionStatus === "connected"
    ) {
      const updateTerminalSize = async () => {
        try {
          // Update local terminal service state immediately
          terminalService.updateTerminalSize(sshSession.id, terminalSize);

          // Send resize to remote terminal if we've already received output
          await sshConnectionService.resizeTerminal(
            sshSession.id,
            terminalSize,
          );

          logger.info(
            `Terminal size updated to ${terminalSize.cols}x${terminalSize.rows}`,
          );
        } catch (err) {
          logger.warn("Failed to update terminal size:", err);
        }
      };

      updateTerminalSize();
    }
  }, [
    terminalSize,
    sshSession,
    terminalService,
    sshConnectionService,
    connectionStatus,
  ]);

  // Cleanup effect that only runs on unmount
  useEffect(() => {
    return () => {
      if (sshSession && sshConnectionService) {
        sshConnectionService.disconnectSession(sshSession.id).catch(
          console.error,
        );
      }
      if (terminalState && terminalService) {
        terminalService.removeTerminalState(terminalState.sessionId);
      }
    };
  }, []); // Empty dependency array - cleanup function only runs on unmount

  /**
   * Handle keystroke forwarding when focused.
   */
  useInput(async (input, key) => {
    if (
      !isFocused || !sshSession || !sshConnectionService ||
      connectionStatus !== "connected"
    ) {
      return;
    }

    try {
      // Convert special keys to appropriate escape sequences
      let keystroke = input;

      if (key.return) {
        keystroke = "\r";
      } else if (key.backspace || key.delete) {
        keystroke = "\x7f";
      } else if (key.tab) {
        keystroke = "\t";
      } else if (key.upArrow) {
        keystroke = "\x1b[A";
      } else if (key.downArrow) {
        keystroke = "\x1b[B";
      } else if (key.leftArrow) {
        keystroke = "\x1b[D";
      } else if (key.rightArrow) {
        keystroke = "\x1b[C";
      } else if (key.ctrl && input) {
        // Handle Ctrl+key combinations
        const ctrlCode = input.charCodeAt(0) - "a".charCodeAt(0) + 1;
        keystroke = String.fromCharCode(ctrlCode);
      }

      // Send keystroke to remote shell
      await sshConnectionService.sendKeystroke(sshSession.id, keystroke);
    } catch (err) {
      // Check if this is a session termination error (e.g., remote session ended)
      if (
        err instanceof SSHConnectionError &&
        err.message.includes("No input stream for session")
      ) {
        logger.info(
          `Remote session terminated for session ${sshSession.id}, handling gracefully`,
        );
        setConnectionStatus("disconnected");
        setError("Remote session terminated");

        // Clean up terminal state
        if (terminalState && terminalService) {
          terminalService.removeTerminalState(terminalState.sessionId);
          setTerminalState(undefined);
        }

        // Clean up SSH session
        try {
          await sshConnectionService.disconnectSession(sshSession.id);
        } catch (disconnectErr) {
          logger.warn(
            "Error during cleanup after session termination:",
            disconnectErr,
          );
        }
        setSSHSession(undefined);

        // Notify parent that session terminated so it can switch back to details mode
        onSessionTerminated?.();

        return; // Don't treat this as a regular error
      }

      console.error("Failed to send keystroke:", err);
      setError("Failed to send input");
    }
  });

  /**
   * Get status color for display.
   * @param status SSH session status
   * @returns Color string for status display
   */
  const getStatusColor = (status: SSHSessionStatus): string => {
    switch (status) {
      case "connected":
        return "green";
      case "connecting":
        return "yellow";
      case "disconnected":
        return "gray";
      case "error":
        return "red";
      default:
        return "white";
    }
  };

  /**
   * Get status text for display.
   * @param status SSH session status
   * @returns Human-readable status text
   */
  const getStatusText = (status: SSHSessionStatus): string => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "disconnected":
        return "Disconnected";
      case "error":
        return error || "Error";
      default:
        return "Unknown";
    }
  };

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Status bar */}
      <Box marginBottom={1}>
        <Text color={getStatusColor(connectionStatus)}>
          ● {getStatusText(connectionStatus)}
        </Text>
        {codespaceDisplayName && (
          <Text color="gray" dimColor>({codespaceDisplayName})</Text>
        )}
      </Box>

      {/* Terminal output */}
      <Box flexGrow={1} flexDirection="column" overflow="hidden">
        {terminalState && connectionStatus === "connected" && terminalService &&
          (
            <TTYTerminal
              ttyService={terminalService.getTTYService()}
              sessionId={terminalState.sessionId}
              showCursor={isFocused}
              isFocused={isFocused}
              width="100%"
              height="100%"
              enableScrolling
            />
          )}
        {connectionStatus === "connecting" && (
          <Text color="yellow">Establishing connection...</Text>
        )}
        {connectionStatus === "disconnected" && (
          <Text color="gray">{error || "Session disconnected"}</Text>
        )}
        {connectionStatus === "error" && (
          <Text color="red">{error || "Connection failed"}</Text>
        )}
      </Box>

      {/* Footer with focus indicator */}
      {isFocused && connectionStatus === "connected" && (
        <Box>
          <Text color="blue" dimColor>
            [Shell Mode - Type to interact with remote shell]
          </Text>
        </Box>
      )}
    </Box>
  );
};
