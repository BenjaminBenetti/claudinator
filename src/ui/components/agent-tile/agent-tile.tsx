import React, { useState } from "react";
import { AgentTileProps, DisplayMode } from "./types.ts";
import { DetailsMode } from "./details-mode.tsx";
import { ShellMode } from "./shell-mode.tsx";

export const AgentTile: React.FC<AgentTileProps> = ({
  agent,
  isFocused = false,
}: AgentTileProps) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(DisplayMode.Details);

  const renderMode = () => {
    switch (displayMode) {
      case DisplayMode.Details:
        return <DetailsMode agent={agent} isFocused={isFocused} />;
      case DisplayMode.Shell:
        return <ShellMode agent={agent} isFocused={isFocused} />;
      default:
        return <DetailsMode agent={agent} isFocused={isFocused} />;
    }
  };

  return renderMode();
};