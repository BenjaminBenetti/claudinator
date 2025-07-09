import React, { useState, useEffect, useRef } from "react";
import { Box, useInput, useStdout } from "ink";
import { AgentList } from "../components/agent-list.tsx";
import { TileContainer, TileContainerRef } from "../components/tile-container.tsx";
import { AgentTile } from "../components/agent-tile.tsx";
import { AgentService } from "../../agent/service/agent-service.ts";
import { UIStateService, FocusArea } from "../service/ui-state-service.ts";

interface MainApplicationPageProps {
  agentService: AgentService;
  uiStateService: UIStateService;
}

export const MainApplicationPage: React.FC<MainApplicationPageProps> = ({
  agentService,
  uiStateService
}) => {
  const { stdout } = useStdout();
  const tileContainerRef = useRef<TileContainerRef>(null);
  const [agents, setAgents] = useState(() => agentService.listAgents());
  const [selectedAgents, setSelectedAgents] = useState(() => agentService.getSelectedAgents());
  const [focusArea, setFocusArea] = useState(() => uiStateService.getFocusArea());
  const [selectedListIndex, setSelectedListIndex] = useState(() => uiStateService.getSelectedListIndex());
  const [focusedTileIndex, setFocusedTileIndex] = useState(() => uiStateService.getFocusedTileIndex());

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

  const handleNewAgent = () => {
    const newAgent = agentService.createAgent(`Agent ${agentService.getAgentCount() + 1}`);
    refreshAgents();
    
    // Select the new agent in the list
    const newIndex = agents.findIndex(a => a.id === newAgent.id);
    if (newIndex !== -1) {
      handleSelectionChange(newIndex);
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

  useInput((input, key) => {
    if (key.tab) {
      uiStateService.cycleFocus(selectedAgents.length);
      setFocusArea(uiStateService.getFocusArea());
      return;
    }

    if (focusArea === FocusArea.Tile && selectedAgents.length > 1) {
      if (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow) {
        const direction = key.upArrow ? 'up' : 
                         key.downArrow ? 'down' : 
                         key.leftArrow ? 'left' : 'right';
        
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
    <Box flexDirection="row" width="100%" minHeight={stdout.rows}>
      <AgentList
        agents={agents}
        selectedIndex={selectedListIndex}
        focusArea={focusArea}
        selectedAgents={selectedAgents}
        onSelectionChange={handleSelectionChange}
        onAgentSelect={handleAgentSelect}
        onNewAgent={handleNewAgent}
      />
      
      <Box marginLeft={1} height="100%">
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
    </Box>
  );
};