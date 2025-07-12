import { useCallback, useState } from "react";
import type { Agent } from "../../agent/models/agent-model.ts";

/**
 * Hook to manage agent selection state in the UI layer
 */
export function useAgentSelection() {
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(
    new Set(),
  );

  /**
   * Selects an agent by adding it to the selection
   * @param agentId The ID of the agent to select
   * @returns True if agent was selected, false if already selected
   */
  const selectAgent = useCallback((agentId: string): boolean => {
    if (selectedAgentIds.has(agentId)) {
      return false;
    }
    setSelectedAgentIds((prev) => new Set([...prev, agentId]));
    return true;
  }, [selectedAgentIds]);

  /**
   * Deselects an agent by removing it from the selection
   * @param agentId The ID of the agent to deselect
   */
  const deselectAgent = useCallback((agentId: string): void => {
    setSelectedAgentIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(agentId);
      return newSet;
    });
  }, []);

  /**
   * Toggles agent selection state
   * @param agentId The ID of the agent to toggle
   * @returns True if agent is now selected, false if deselected
   */
  const toggleAgentSelection = useCallback((agentId: string): boolean => {
    if (selectedAgentIds.has(agentId)) {
      deselectAgent(agentId);
      return false;
    } else {
      selectAgent(agentId);
      return true;
    }
  }, [selectedAgentIds, selectAgent, deselectAgent]);

  /**
   * Gets all selected agents from a list of agents
   * @param allAgents List of all available agents
   * @returns Array of selected agents
   */
  const getSelectedAgents = useCallback((allAgents: Agent[]): Agent[] => {
    return allAgents.filter((agent) => selectedAgentIds.has(agent.id));
  }, [selectedAgentIds]);

  /**
   * Gets the selected agent IDs as an array
   * @returns Array of selected agent IDs
   */
  const getSelectedAgentIds = useCallback((): string[] => {
    return Array.from(selectedAgentIds);
  }, [selectedAgentIds]);

  /**
   * Checks if an agent is selected
   * @param agentId The ID of the agent to check
   * @returns True if agent is selected
   */
  const isAgentSelected = useCallback((agentId: string): boolean => {
    return selectedAgentIds.has(agentId);
  }, [selectedAgentIds]);

  /**
   * Clears all selected agents
   */
  const clearSelectedAgents = useCallback((): void => {
    setSelectedAgentIds(new Set());
  }, []);

  /**
   * Gets the count of selected agents
   * @returns Number of selected agents
   */
  const getSelectedAgentCount = useCallback((): number => {
    return selectedAgentIds.size;
  }, [selectedAgentIds]);

  return {
    selectAgent,
    deselectAgent,
    toggleAgentSelection,
    getSelectedAgents,
    getSelectedAgentIds,
    isAgentSelected,
    clearSelectedAgents,
    getSelectedAgentCount,
  };
}
