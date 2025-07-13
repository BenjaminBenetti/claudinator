import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Text, useInput, useStdout } from "ink";
import { AgentTileProps } from "./types.ts";
import type {
  SSHSession,
  SSHSessionStatus,
} from "../../../ssh/models/ssh-session-model.ts";
import type { TerminalState } from "../../../ssh/models/terminal-state-model.ts";
import type { ISSHConnectionService } from "../../../ssh/service/ssh-connection-service.ts";
import type { ITerminalService } from "../../../ssh/service/terminal-service.ts";
import type { ITTYService } from "../../../tty/service/tty-service.ts";
import { logger } from "../../../logger/logger.ts";

interface ShellModeProps extends AgentTileProps {
  sshConnectionService?: ISSHConnectionService;
  terminalService?: ITerminalService;
  ttyService?: ITTYService;
}

export const ShellMode: React.FC<ShellModeProps> = ({
  agent,
  isFocused = false,
  sshConnectionService,
  terminalService,
  ttyService,
}: ShellModeProps) => {
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

  // Calculate terminal dimensions based on actual available space
  const terminalSize = useMemo(() => {
    // Account for tile container margins, status bar, and component padding
    // Tile container uses: stdout.columns - 27, stdout.rows - 3
    // We need to further account for tile borders, status bar, and margins
    const availableWidth = Math.max(
      20,
      Math.floor((stdout.columns - 27) / 2) - 4,
    ); // Account for 2-column layout and borders
    const availableHeight = Math.max(5, stdout.rows - 3 - 3); // Account for status bar and margins

    return {
      cols: availableWidth,
      rows: availableHeight,
    };
  }, [stdout.columns, stdout.rows]);

  // Initialize SSH connection when component mounts (only once)
  useEffect(() => {
    if (!agent.codespaceId || !sshConnectionService || !terminalService) {
      setError("Missing codespace ID or SSH services");
      setConnectionStatus("error");
      return;
    }

    // Only initialize if we haven't already initialized
    if (isInitializedRef.current) {
      return;
    }

    const initializeConnection = async () => {
      try {
        isInitializedRef.current = true;
        setConnectionStatus("connecting");
        setError(undefined);

        // Use the memoized terminal size
        const session = await sshConnectionService.connectToCodespace(
          agent.id,
          agent.codespaceId!,
          terminalSize,
        );

        setSSHSession(session);
        setConnectionStatus(session.status);

        // Create terminal state with automatic output pump
        if (!ttyService) {
          throw new Error("TTY service is required for shell mode");
        }

        const termState = terminalService.createTerminalState(
          session.id,
          sshConnectionService,
          ttyService,
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
  ]); // Include dependencies for safety

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

  // Handle keystroke forwarding when focused
  useInput((input, key) => {
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
      } else if (key.backspace) {
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
      sshConnectionService.sendKeystroke(sshSession.id, keystroke);
    } catch (err) {
      console.error("Failed to send keystroke:", err);
      setError("Failed to send input");
    }
  });

  // Get status color for display
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

  // Get status text for display
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

  // If no SSH services provided, show error
  if (!sshConnectionService || !terminalService) {
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Text color="red">SSH services not available</Text>
        <Text color="gray" dimColor>Cannot establish shell connection</Text>
      </Box>
    );
  }

  // If no codespace, show message
  if (!agent.codespaceId) {
    return (
      <Box flexDirection="column" width="100%" height="100%">
        <Text color="yellow">No codespace attached</Text>
        <Text color="gray" dimColor>
          This agent needs a codespace to use shell mode
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Status bar */}
      <Box marginBottom={1}>
        <Text color={getStatusColor(connectionStatus)}>
          ● {getStatusText(connectionStatus)}
        </Text>
        {agent.codespaceDisplayName && (
          <Text color="gray" dimColor>({agent.codespaceDisplayName})</Text>
        )}
      </Box>

      {/* Terminal output area */}
      <Box flexDirection="column" flexGrow={1}>
        {terminalState && terminalService && connectionStatus === "connected"
          ? (
            (() => {
              try {
                return terminalService.getVisibleLines(terminalState.sessionId)
                  .map((
                    line,
                    index,
                  ) => (
                    <React.Fragment
                      key={`${terminalState.sessionId}-${terminalState.scrollPosition}-${index}-${
                        line.slice(0, 20)
                      }`}
                    >
                      <Text>{line || " "}</Text>
                    </React.Fragment>
                  ));
              } catch (error) {
                console.warn("Failed to get visible lines:", error);
                return <Text color="gray" dimColor>Terminal disconnected</Text>;
              }
            })()
          )
          : <Text color="gray" dimColor>Initializing terminal...</Text>}
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
