import React from "react";
import { useInput } from "ink";
import { AgentTileProps, DisplayMode } from "./types.ts";
import { DetailsMode } from "./details-mode.tsx";
import { ShellMode } from "./shell-mode.tsx";

export const AgentTile: React.FC<AgentTileProps> = ({
  agent,
  isFocused = false,
  displayMode = DisplayMode.Details,
  onDisplayModeChange,
  sshConnectionService,
  terminalService,
  tileCount = 1,
}: AgentTileProps) => {
  // Handle mode switching when this tile is focused
  useInput((input, _key) => {
    // Only handle input when this tile is focused and not in shell mode
    // (shell mode handles its own input)
    if (!isFocused || displayMode === DisplayMode.Shell) {
      return;
    }

    // Handle 's' key to switch to shell mode
    if (input === "s" && agent.codespaceId) {
      onDisplayModeChange?.(agent.id, DisplayMode.Shell);
      return;
    }

    // Handle 'd' key to switch to details mode
    if (input === "d") {
      onDisplayModeChange?.(agent.id, DisplayMode.Details);
      return;
    }
  });

  /**
   * Handle session termination by switching back to details mode.
   */
  const handleSessionTerminated = () => {
    onDisplayModeChange?.(agent.id, DisplayMode.Details);
  };

  const renderMode = () => {
    switch (displayMode) {
      case DisplayMode.Details:
        return <DetailsMode agent={agent} isFocused={isFocused} />;
      case DisplayMode.Shell:
        return (
          <ShellMode
            agent={agent}
            isFocused={isFocused}
            sshConnectionService={sshConnectionService}
            terminalService={terminalService}
            tileCount={tileCount}
            onSessionTerminated={handleSessionTerminated}
          />
        );
      default:
        return <DetailsMode agent={agent} isFocused={isFocused} />;
    }
  };

  return renderMode();
};
