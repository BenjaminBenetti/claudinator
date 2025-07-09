import React, { useState, useEffect } from "react";
import { Box, useInput } from "ink";
import { AgentList } from "../components/agent-list.tsx";
import { TileContainer } from "../components/tile-container.tsx";
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
        
        const containerWidth = 100; // Approximate width
        const containerHeight = 30; // Approximate height
        const layout = uiStateService.calculateTileLayout(containerWidth, containerHeight, selectedAgents.length);
        
        uiStateService.moveTileFocus(direction, layout, selectedAgents.length);
        setFocusedTileIndex(uiStateService.getFocusedTileIndex());
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
    <Box flexDirection="row" width="100%" height="100%">
      <AgentList
        agents={agents}
        selectedIndex={selectedListIndex}
        focusArea={focusArea}
        selectedAgents={selectedAgents}
        onSelectionChange={handleSelectionChange}
        onAgentSelect={handleAgentSelect}
        onNewAgent={handleNewAgent}
      />
      
      <Box marginLeft={1}>
        <TileContainer
          children={tileChildren}
          borderStyle="round"
          borderColor={focusArea === FocusArea.MainContent || focusArea === FocusArea.Tile ? "blue" : "gray"}
          emptyMessage="Select agents from the sidebar to view their details"
          focusedTileIndex={focusedTileIndex}
          onTileFocus={handleTileFocusChange}
        />
      </Box>
    </Box>
  );
};