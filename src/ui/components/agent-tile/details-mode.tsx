import React from "react";
import { Box, Text } from "ink";
import { AgentTileProps } from "./types.ts";

export const DetailsMode: React.FC<AgentTileProps> = ({
  agent,
  isFocused = false,
}: AgentTileProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "green";
      case "running":
        return "blue";
      case "provisioning":
        return "yellow";
      case "error":
        return "red";
      default:
        return "gray";
    }
  };

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case "active":
        return "●";
      case "running":
        return "▶";
      case "provisioning":
        return "●";
      case "error":
        return "✗";
      default:
        return "○";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "active":
        return "Active";
      case "running":
        return "Running";
      case "provisioning":
        return "Provisioning";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box marginBottom={1} justifyContent="space-between">
        <Text color="white" bold>
          {agent.name}
        </Text>
        <Box>
          <Text color={getStatusColor(agent.status)}>
            {getStatusSymbol(agent.status)}
          </Text>
          <Text color={getStatusColor(agent.status)}>
            {" " + getStatusText(agent.status)}
          </Text>
        </Box>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          ID: {agent.id}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text color="gray" dimColor>
          Created: {formatDate(agent.createdAt)}
        </Text>
      </Box>

      {agent.codespaceDisplayName && (
        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            Codespace: {agent.codespaceDisplayName}
          </Text>
        </Box>
      )}

      <Box flexGrow={1} flexDirection="column">
        <Text color="white">
          Agent Details
        </Text>
        {agent.status === "error" && agent.errorMessage
          ? (
            <Text color="red">
              Error: {agent.errorMessage}
            </Text>
          )
          : (
            <Text color="gray" dimColor>
              This agent is {getStatusText(agent.status).toLowerCase()}{" "}
              and ready for tasks.
            </Text>
          )}
      </Box>

      {isFocused && (
        <Box>
          <Text color="blue" dimColor>
            [Focused - Use arrow keys to navigate]
          </Text>
        </Box>
      )}
    </Box>
  );
};
