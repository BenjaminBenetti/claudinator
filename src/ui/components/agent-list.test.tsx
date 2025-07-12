import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { AgentList } from "./agent-list.tsx";
import { Agent, AgentStatus } from "../../agent/models/agent-model.ts";
import { FocusArea } from "../service/ui-state-service.ts";

const mockAgents: Agent[] = [
  {
    id: "1",
    name: "Agent 1",
    status: AgentStatus.Active,
    createdAt: new Date(),
  },
  {
    id: "2",
    name: "Agent 2",
    status: AgentStatus.Running,
    createdAt: new Date(),
  },
  {
    id: "3",
    name: "Agent 3",
    status: AgentStatus.Error,
    createdAt: new Date(),
  },
];

const mockProps = {
  agents: mockAgents,
  selectedIndex: 0,
  focusArea: FocusArea.Sidebar,
  selectedAgents: [],
  onSelectionChange: () => {},
  onAgentSelect: () => {},
  onNewAgent: () => {},
};

Deno.test("Unit - AgentList should render without crashing", async () => {
  const component = TestRenderer.create(<AgentList {...mockProps} />);
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should render with blue border when focused", async () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.Sidebar} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that border is blue when focused
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"borderColor":"blue"'), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should render with gray border when not focused", async () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.Tile} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that border is gray when not focused
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"borderColor":"gray"'), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should render all agents", async () => {
  const component = TestRenderer.create(<AgentList {...mockProps} />);
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that all agents are rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Agent 1"), true);
  assertEquals(jsonString.includes("Agent 2"), true);
  assertEquals(jsonString.includes("Agent 3"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should render with empty agents list", async () => {
  const emptyProps = {
    ...mockProps,
    agents: [],
  };

  const component = TestRenderer.create(<AgentList {...emptyProps} />);
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that title and new agent button are still rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Agents"), true);
  assertEquals(jsonString.includes("New Agent"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should have correct container structure", async () => {
  const component = TestRenderer.create(<AgentList {...mockProps} />);
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that container has correct structure
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes('"flexDirection":"column"'), true);
  assertEquals(jsonString.includes('"borderStyle":"round"'), true);
  assertEquals(jsonString.includes('"width":25'), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should show help text when focused", async () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.Sidebar} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that help text is shown when focused
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Navigate"), true);
  assertEquals(jsonString.includes("Space/Enter Select"), true);
  assertEquals(jsonString.includes("Ctrl + C to Exit"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should handle different selected indices", async () => {
  // Test first agent selected
  const component1 = TestRenderer.create(
    <AgentList
      {...mockProps}
      selectedIndex={0}
      focusArea={FocusArea.Sidebar}
    />,
  );
  const tree1 = component1.toJSON();
  assertEquals(tree1 !== null, true);

  const jsonString1 = JSON.stringify(tree1);
  assertEquals(jsonString1.includes(">"), true); // Selection indicator
  component1.unmount();

  // Test second agent selected
  const component2 = TestRenderer.create(
    <AgentList
      {...mockProps}
      selectedIndex={1}
      focusArea={FocusArea.Sidebar}
    />,
  );
  const tree2 = component2.toJSON();
  assertEquals(tree2 !== null, true);

  const jsonString2 = JSON.stringify(tree2);
  assertEquals(jsonString2.includes(">"), true); // Selection indicator
  component2.unmount();

  // Test "New Agent" button selected
  const component3 = TestRenderer.create(
    <AgentList
      {...mockProps}
      selectedIndex={mockAgents.length}
      focusArea={FocusArea.Sidebar}
    />,
  );
  const tree3 = component3.toJSON();
  assertEquals(tree3 !== null, true);

  const jsonString3 = JSON.stringify(tree3);
  assertEquals(jsonString3.includes("New Agent"), true);
  assertEquals(jsonString3.includes(">"), true);
  component3.unmount();

  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentList should render with selected agents in tile area", async () => {
  const propsWithSelectedAgents = {
    ...mockProps,
    selectedAgents: [mockAgents[0], mockAgents[2]], // First and third agents are in tile area
  };

  const component = TestRenderer.create(
    <AgentList {...propsWithSelectedAgents} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  // Check that selected agents show the tile area indicator
  const jsonString = JSON.stringify(tree);
  // Should contain multiple play symbols (▶) for agents in tile area
  const playSymbolCount = (jsonString.match(/▶/g) || []).length;
  assertEquals(playSymbolCount >= 2, true); // At least 2 for the selected agents

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});
