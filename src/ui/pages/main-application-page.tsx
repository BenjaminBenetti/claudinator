import React, { useEffect, useRef, useState } from "react";
import { Box, useInput, useStdout } from "ink";
import { AgentList } from "../components/agent-list.tsx";
import {
  TileContainer,
  TileContainerRef,
} from "../components/tile-container.tsx";
import { AgentTile } from "../components/agent-tile.tsx";
import { HelpBar } from "../components/help-bar.tsx";
import { ErrorModal } from "../components/error-modal.tsx";
import { AgentService } from "../../agent/service/agent-service.ts";
import { FocusArea, UIStateService } from "../service/ui-state-service.ts";
import { AgentStatus } from "../../agent/models/agent-model.ts";

interface MainApplicationPageProps {
  agentService: AgentService;
  uiStateService: UIStateService;
}

export const MainApplicationPage: React.FC<MainApplicationPageProps> = ({
  agentService,
  uiStateService,
}: MainApplicationPageProps) => {
  const { stdout } = useStdout();
  const tileContainerRef = useRef<TileContainerRef>(null);
  const [agents, setAgents] = useState(() => agentService.listAgents());
  const [selectedAgents, setSelectedAgents] = useState(() =>
    agentService.getSelectedAgents()
  );
  const [focusArea, setFocusArea] = useState(() =>
    uiStateService.getFocusArea()
  );
  const [selectedListIndex, setSelectedListIndex] = useState(() =>
    uiStateService.getSelectedListIndex()
  );
  const [focusedTileIndex, setFocusedTileIndex] = useState(() =>
    uiStateService.getFocusedTileIndex()
  );
  const [errorModalVisible, setErrorModalVisible] = useState(() =>
    uiStateService.isErrorModalVisible()
  );
  const [errorModalMessage, setErrorModalMessage] = useState(() =>
    uiStateService.getErrorModalMessage()
  );

  const refreshAgents = () => {
    setAgents(agentService.listAgents());
    setSelectedAgents(agentService.getSelectedAgents());
  };

  const handleSelectionChange = (index: number) => {
    uiStateService.setSelectedListIndex(index);
    setSelectedListIndex(index);
  };

  const handleAgentSelect = (agentId: string) => {
    agentService.toggleAgentSelection(agentId);
    refreshAgents();
  };

  const handleNewAgent = async () => {
    try {
      const newAgent = await agentService.createAgentWithAutoCodespace(
        `Agent ${agentService.getAgentCount() + 1}`,
      );
      refreshAgents();

      // Select the new agent in the list
      const newIndex = agents.findIndex((a) => a.id === newAgent.id);
      if (newIndex !== -1) {
        handleSelectionChange(newIndex);
      }

      // Set up periodic refresh to capture status updates during provisioning
      const refreshInterval = setInterval(() => {
        const currentAgent = agentService.getAgent(newAgent.id);
        if (
          currentAgent && (currentAgent.status !== AgentStatus.Provisioning)
        ) {
          clearInterval(refreshInterval);
        }
        refreshAgents();
      }, 1000); // Refresh every second during provisioning

      // Clean up interval after 5 minutes to prevent infinite polling
      setTimeout(() => {
        clearInterval(refreshInterval);
      }, 5 * 60 * 1000);
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : "Unknown error occurred";
      uiStateService.showErrorModal(
        `Failed to create agent with codespace: ${errorMessage}`,
      );
      setErrorModalVisible(true);
      setErrorModalMessage(uiStateService.getErrorModalMessage());
    }
  };

  const handleFocusChange = (newFocus: FocusArea) => {
    uiStateService.setFocusArea(newFocus);
    setFocusArea(newFocus);
  };

  const handleTileFocusChange = (index: number) => {
    uiStateService.setFocusedTileIndex(index);
    setFocusedTileIndex(index);
  };

  const handleErrorModalClose = () => {
    uiStateService.hideErrorModal();
    setErrorModalVisible(false);
    setErrorModalMessage("");
  };

  useInput((input, key) => {
    // Don't handle input when error modal is visible
    if (errorModalVisible) {
      return;
    }

    if (key.tab) {
      uiStateService.cycleFocus(selectedAgents.length);
      setFocusArea(uiStateService.getFocusArea());
      return;
    }

    if (focusArea === FocusArea.Tile && selectedAgents.length > 1) {
      if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
        const direction = key.upArrow
          ? "up"
          : key.downArrow
          ? "down"
          : key.leftArrow
          ? "left"
          : "right";

        tileContainerRef.current?.navigateTile(direction);
      }
    }
  });

  // Create tile children for selected agents
  const tileChildren = selectedAgents.map((agent, index) => (
    <AgentTile
      key={agent.id}
      agent={agent}
      isFocused={focusArea === FocusArea.Tile && index === focusedTileIndex}
    />
  ));

  return (
    <>
      <Box flexDirection="row" width="100%" height={stdout.rows}>
        <AgentList
          agents={agents}
          selectedIndex={selectedListIndex}
          focusArea={focusArea}
          selectedAgents={selectedAgents}
          onSelectionChange={handleSelectionChange}
          onAgentSelect={handleAgentSelect}
          onNewAgent={handleNewAgent}
        />

        <Box flexDirection="column" marginLeft={1} height="100%">
          <Box flexGrow={1}>
            <TileContainer
              ref={tileContainerRef}
              borderStyle="round"
              borderColor={focusArea === FocusArea.Tile ? "blue" : "gray"}
              emptyMessage="Select agents from the sidebar to view their details"
              focusedTileIndex={focusedTileIndex}
              onTileFocus={handleTileFocusChange}
            >
              {tileChildren}
            </TileContainer>
          </Box>
          <HelpBar focusArea={focusArea} />
        </Box>
      </Box>
      <ErrorModal
        isVisible={errorModalVisible}
        message={errorModalMessage}
        onClose={handleErrorModalClose}
      />
    </>
  );
};
