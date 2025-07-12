import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { Agent } from "../../agent/models/agent-model.ts";
import { FocusArea } from "../service/ui-state-service.ts";

interface AgentListProps {
  agents: Agent[];
  selectedIndex: number;
  focusArea: FocusArea;
  selectedAgents: Agent[];
  onSelectionChange: (index: number) => void;
  onAgentSelect: (agentId: string) => void;
  onNewAgent: () => void;
}

export const AgentList: React.FC<AgentListProps> = ({
  agents,
  selectedIndex,
  focusArea,
  selectedAgents,
  onSelectionChange,
  onAgentSelect,
  onNewAgent,
}: AgentListProps) => {
  const isActive = focusArea === FocusArea.Sidebar;
  const totalItems = agents.length + 1; // +1 for "New Agent" button

  // Spinner state for provisioning indicator
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const hasProvisioningAgents = agents.some((agent) =>
      agent.status === "provisioning"
    );

    if (hasProvisioningAgents) {
      const spinnerInterval = setInterval(() => {
        setSpinnerIndex((prev: number) => (prev + 1) % spinner.length);
      }, 100);

      return () => {
        clearInterval(spinnerInterval);
      };
    }
  }, [agents]);

  useInput((input, key) => {
    if (!isActive) return;

    if (key.upArrow) {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : totalItems - 1;
      onSelectionChange(newIndex);
    } else if (key.downArrow) {
      const newIndex = selectedIndex < totalItems - 1 ? selectedIndex + 1 : 0;
      onSelectionChange(newIndex);
    } else if (key.return || input === " ") {
      if (selectedIndex < agents.length) {
        onAgentSelect(agents[selectedIndex].id);
      } else {
        onNewAgent();
      }
    }
  });

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

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isActive ? "blue" : "gray"}
      paddingX={1}
      paddingY={1}
      width={25}
      height="100%"
    >
      <Box marginBottom={1}>
        <Text color="white" bold>Agents</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {agents.map((agent, index) => {
          const isCurrentlySelected = selectedIndex === index && isActive;
          const isInTileArea = selectedAgents.some((selected) =>
            selected.id === agent.id
          );

          return (
            <Box
              key={agent.id}
              marginBottom={0}
              flexDirection="row"
              justifyContent="space-between"
              width="100%"
            >
              <Box flexDirection="column" flexGrow={1}>
                <Text
                  color={isCurrentlySelected ? "blue" : "white"}
                  backgroundColor={isCurrentlySelected ? "white" : undefined}
                  bold={isCurrentlySelected}
                >
                  {isCurrentlySelected ? ">" : " "}
                  <Text color={getStatusColor(agent.status)}>
                    {getStatusSymbol(agent.status)}
                  </Text>
                  {" " + agent.name}
                </Text>
                {agent.status === "provisioning" && (
                  <Text color="yellow">
                    {"   "}
                    {spinner[spinnerIndex]} Provisioning...
                  </Text>
                )}
              </Box>
              {isInTileArea && <Text color="green" bold>▶</Text>}
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1}>
        <Text
          color={selectedIndex === agents.length && isActive ? "blue" : "green"}
          backgroundColor={selectedIndex === agents.length && isActive
            ? "white"
            : undefined}
          bold={selectedIndex === agents.length && isActive}
        >
          {selectedIndex === agents.length && isActive ? ">" : " "} + New Agent
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          ↑↓ Navigate, Space/Enter Select, Ctrl + C to Exit
        </Text>
      </Box>
    </Box>
  );
};
