import React, { useRef, useState } from "react";
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
import { DisplayMode } from "../components/agent-tile/types.ts";
import { useAgentSelection } from "../hooks/use-agent-selection.ts";
import { createSSHServices } from "../../ssh/service/ssh-service-factory.ts";

const sshServices = createSSHServices();

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
  const [displayModeUpdateTrigger, setDisplayModeUpdateTrigger] = useState(0);

  // Use the agent selection hook
  const {
    toggleAgentSelection,
    getSelectedAgents,
    getSelectedAgentCount,
  } = useAgentSelection();

  const refreshAgents = () => {
    setAgents(agentService.listAgents());
  };

  const handleSelectionChange = (index: number) => {
    uiStateService.setSelectedListIndex(index);
    setSelectedListIndex(index);
  };

  const handleAgentSelect = (agentId: string) => {
    toggleAgentSelection(agentId);
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

  const handleTileFocusChange = (index: number) => {
    uiStateService.setFocusedTileIndex(index);
    setFocusedTileIndex(index);
  };

  const handleErrorModalClose = () => {
    uiStateService.hideErrorModal();
    setErrorModalVisible(false);
    setErrorModalMessage("");
  };

  const handleDisplayModeChange = (agentId: string, mode: DisplayMode) => {
    uiStateService.setTileDisplayMode(agentId, mode);
    // Trigger re-render to update the displayMode prop
    setDisplayModeUpdateTrigger(prev => prev + 1);
  };

  useInput((_input, key) => {
    // Don't handle input when error modal is visible
    if (errorModalVisible) {
      return;
    }

    if (key.tab) {
      // Check if any focused tile is in shell mode - if so, don't cycle focus
      if (focusArea === FocusArea.Tile) {
        const selectedAgents = getSelectedAgents(agents);
        const focusedAgent = selectedAgents[focusedTileIndex];
        if (
          focusedAgent &&
          uiStateService.getTileDisplayMode(focusedAgent.id) ===
            DisplayMode.Shell
        ) {
          return; // Don't handle tab if terminal has focus
        }
      }

      uiStateService.cycleFocus(getSelectedAgentCount());
      setFocusArea(uiStateService.getFocusArea());
      return;
    }

    if (focusArea === FocusArea.Tile) {
      if (
        getSelectedAgentCount() > 1 &&
        (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow)
      ) {
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
  const selectedAgents = getSelectedAgents(agents);
  const tileChildren = selectedAgents.map((agent, index) => (
    <AgentTile
      key={agent.id}
      agent={agent}
      isFocused={focusArea === FocusArea.Tile && index === focusedTileIndex}
      displayMode={uiStateService.getTileDisplayMode(agent.id)}
      onDisplayModeChange={handleDisplayModeChange}
      sshConnectionService={sshServices.connectionService}
      terminalService={sshServices.terminalService}
      tileCount={selectedAgents.length}
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
