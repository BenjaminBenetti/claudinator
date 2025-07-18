import React from "react";
import { Box, Text } from "ink";
import { AgentTileProps } from "./types.ts";
import type { ISSHConnectionService } from "../../../ssh/service/ssh-connection-service.ts";
import type { ITerminalService } from "../../../ssh/service/terminal-service.ts";
import { Terminal } from "../terminal/terminal.tsx";

interface ShellModeProps extends AgentTileProps {
  sshConnectionService?: ISSHConnectionService;
  terminalService?: ITerminalService;
  tileCount?: number;
}

export const ShellMode: React.FC<ShellModeProps> = ({
  agent,
  isFocused = false,
  sshConnectionService,
  terminalService,
  tileCount = 1,
}: ShellModeProps) => {
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
    <Terminal
      agentId={agent.id}
      codespaceId={agent.codespaceId}
      codespaceDisplayName={agent.codespaceDisplayName}
      isFocused={isFocused}
      sshConnectionService={sshConnectionService}
      terminalService={terminalService}
      tileCount={tileCount}
      width="100%"
      height="100%"
    />
  );
};
