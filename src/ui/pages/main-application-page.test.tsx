import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { MainApplicationPage } from "./main-application-page.tsx";
import { createAgentService } from "../../agent/service/agent-service.ts";
import { createAgentRepository } from "../../agent/repo/agent-repo.ts";
import {
  createUIStateService,
  FocusArea,
} from "../service/ui-state-service.ts";

const createMockServices = () => {
  const agentRepository = createAgentRepository();
  const agentService = createAgentService(agentRepository);
  const uiStateService = createUIStateService();

  return { agentService, uiStateService };
};

Deno.test("Unit - MainApplicationPage should render without crashing", async () => {
  const { agentService, uiStateService } = createMockServices();

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should render with empty agents list", async () => {
  const { agentService, uiStateService } = createMockServices();

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that empty message is shown when no agents are selected
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Select agents from the sidebar"), true);
  assertEquals(jsonString.includes("Agents"), true); // Sidebar title

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should render with agents", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Add some agents
  agentService.createAgent("Test Agent 1");
  agentService.createAgent("Test Agent 2");

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that agents are rendered in the sidebar
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Test Agent 1"), true);
  assertEquals(jsonString.includes("Test Agent 2"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should render with selected agents", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Add and select some agents
  const agent1 = agentService.createAgent("Test Agent 1");
  const agent2 = agentService.createAgent("Test Agent 2");

  agentService.selectAgent(agent1.id);
  agentService.selectAgent(agent2.id);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that selected agents are rendered in the tile area
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Test Agent 1"), true);
  assertEquals(jsonString.includes("Test Agent 2"), true);
  // Check that tile area indicators are present
  assertEquals(jsonString.includes("▶"), true); // Play symbol for selected agents

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should have proper container structure", async () => {
  const { agentService, uiStateService } = createMockServices();

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that the main container has the correct structure
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"flexDirection":"row"'), true);
  assertEquals(jsonString.includes('"width":"100%"'), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should handle services initialization", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Verify initial state
  assertEquals(agentService.getAgentCount(), 0);
  assertEquals(agentService.getSelectedAgentCount(), 0);
  assertEquals(uiStateService.getSelectedListIndex(), 0);
  assertEquals(uiStateService.getFocusedTileIndex(), 0);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should handle different UI states", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Create some agents to test with
  agentService.createAgent("Agent 1");
  agentService.createAgent("Agent 2");

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that the UI renders correctly with different states
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Agent 1"), true);
  assertEquals(jsonString.includes("Agent 2"), true);
  assertEquals(jsonString.includes("New Agent"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should handle agent operations", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Test creating agents
  const agent1 = agentService.createAgent("Agent 1");
  const agent2 = agentService.createAgent("Agent 2");

  assertEquals(agentService.getAgentCount(), 2);

  // Test selecting agents
  agentService.selectAgent(agent1.id);
  assertEquals(agentService.getSelectedAgentCount(), 1);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that the agent operations are reflected in the UI
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Agent 1"), true);
  assertEquals(jsonString.includes("Agent 2"), true);
  // Check that the selected agent shows up in the tile area
  assertEquals(jsonString.includes("▶"), true); // Play symbol for selected agent

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should handle edge cases", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Test with maximum realistic number of agents
  for (let i = 0; i < 10; i++) {
    agentService.createAgent(`Agent ${i + 1}`);
  }

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that all agents are rendered properly
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Agent 1"), true);
  assertEquals(jsonString.includes("Agent 10"), true);
  assertEquals(jsonString.includes("Agents"), true); // Sidebar title

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - MainApplicationPage should handle state synchronization", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Create agents and modify state
  const agent = agentService.createAgent("Test Agent");
  agentService.selectAgent(agent.id);
  uiStateService.setSelectedListIndex(0);
  uiStateService.setFocusedTileIndex(0);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that state synchronization is reflected in the UI
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Test Agent"), true);
  // Check that the agent is shown both in sidebar and tile area
  assertEquals(jsonString.includes("▶"), true); // Play symbol for selected agent

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should render help bar", async () => {
  const { agentService, uiStateService } = createMockServices();

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that help bar is rendered with default sidebar help text
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("d - Details"), true);
  assertEquals(jsonString.includes("esc - Clear all selection"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should render help bar with sidebar focus", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Ensure sidebar focus
  uiStateService.setFocusArea(FocusArea.Sidebar);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that help bar displays sidebar-specific help text
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("d - Details"), true);
  assertEquals(jsonString.includes("esc - Clear all selection"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should render help bar with tile focus", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Create and select agents to enable tile focus
  const agent1 = agentService.createAgent("Test Agent 1");
  const agent2 = agentService.createAgent("Test Agent 2");
  agentService.selectAgent(agent1.id);
  agentService.selectAgent(agent2.id);

  // Set tile focus
  uiStateService.setFocusArea(FocusArea.Tile);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that help bar displays tile-specific help text
  const jsonString = JSON.stringify(tree);

  // Check for the complete tile help text
  const tileHelpText = "d - Details, t - Terminal, m - Menu, backspace - Close";
  assertEquals(jsonString.includes(tileHelpText), true);

  // Ensure sidebar-specific help text is NOT present
  const sidebarHelpText = "d - Details, esc - Clear all selection";
  assertEquals(jsonString.includes(sidebarHelpText), false);

  // Check for unique tile text
  assertEquals(jsonString.includes("t - Terminal"), true);
  assertEquals(jsonString.includes("m - Menu"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should maintain layout structure with help bar", async () => {
  const { agentService, uiStateService } = createMockServices();

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that main container still has row layout
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"flexDirection":"row"'), true);
  assertEquals(jsonString.includes('"width":"100%"'), true);

  // Check that right column now has column layout
  assertEquals(jsonString.includes('"flexDirection":"column"'), true);
  assertEquals(jsonString.includes('"marginLeft":1'), true);

  // Check that help bar styling is present
  assertEquals(jsonString.includes('"borderStyle":"single"'), true);
  assertEquals(jsonString.includes('"borderColor":"gray"'), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should not interfere with existing functionality", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Create agents to test existing functionality
  const agent1 = agentService.createAgent("Test Agent 1");
  const agent2 = agentService.createAgent("Test Agent 2");
  agentService.selectAgent(agent1.id);

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that existing functionality still works
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Test Agent 1"), true);
  assertEquals(jsonString.includes("Test Agent 2"), true);
  assertEquals(jsonString.includes("Agents"), true); // Sidebar title
  assertEquals(jsonString.includes("▶"), true); // Play symbol for selected agent

  // Check that help bar is also present
  assertEquals(jsonString.includes("d - Details"), true);
  assertEquals(jsonString.includes("esc - Clear all selection"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should handle focus area changes with help bar", async () => {
  const { agentService, uiStateService } = createMockServices();

  // Create and select agents to enable tile focus
  const agent = agentService.createAgent("Test Agent");
  agentService.selectAgent(agent.id);

  // Test sidebar focus
  uiStateService.setFocusArea(FocusArea.Sidebar);

  const sidebarComponent = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const sidebarTree = sidebarComponent.toJSON();
  const sidebarText = JSON.stringify(sidebarTree);

  assertEquals(sidebarText.includes("d - Details"), true);
  assertEquals(sidebarText.includes("esc - Clear all selection"), true);
  sidebarComponent.unmount();

  // Test tile focus
  uiStateService.setFocusArea(FocusArea.Tile);

  const tileComponent = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tileTree = tileComponent.toJSON();
  const tileText = JSON.stringify(tileTree);

  assertEquals(tileText.includes("t - Terminal"), true);
  assertEquals(tileText.includes("esc - Clear all selection"), false);
  tileComponent.unmount();

  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Integration - MainApplicationPage should position help bar correctly", async () => {
  const { agentService, uiStateService } = createMockServices();

  const component = TestRenderer.create(
    <MainApplicationPage
      agentService={agentService}
      uiStateService={uiStateService}
    />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that help bar is positioned in the right column (not under sidebar)
  const jsonString = JSON.stringify(tree);

  // Verify the layout structure includes help bar in right column
  assertEquals(jsonString.includes('"flexDirection":"column"'), true);
  assertEquals(jsonString.includes('"flexGrow":1'), true);
  assertEquals(jsonString.includes('"borderStyle":"single"'), true);

  // Verify help bar content is present
  assertEquals(jsonString.includes("d - Details"), true);
  assertEquals(jsonString.includes("esc - Clear all selection"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});
