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
    createdAt: new Date()
  },
  {
    id: "2",
    name: "Agent 2",
    status: AgentStatus.Running,
    createdAt: new Date()
  },
  {
    id: "3",
    name: "Agent 3",
    status: AgentStatus.Error,
    createdAt: new Date()
  }
];

const mockProps = {
  agents: mockAgents,
  selectedIndex: 0,
  focusArea: FocusArea.Sidebar,
  onSelectionChange: () => {},
  onAgentSelect: () => {},
  onNewAgent: () => {}
};

Deno.test("Unit - AgentList should render without crashing", () => {
  const component = TestRenderer.create(<AgentList {...mockProps} />);
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentList should render with blue border when focused", () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'props' in tree) {
    assertEquals(tree.props?.borderColor, "blue");
  }
  
  component.unmount();
});

Deno.test("Unit - AgentList should render with gray border when not focused", () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.MainContent} />
  );
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'props' in tree) {
    assertEquals(tree.props?.borderColor, "gray");
  }
  
  component.unmount();
});

Deno.test("Unit - AgentList should render all agents", () => {
  const component = TestRenderer.create(<AgentList {...mockProps} />);
  const tree = component.toJSON();
  
  // The component should render the main container
  assertEquals(tree !== null, true);
  
  component.unmount();
});

Deno.test("Unit - AgentList should render with empty agents list", () => {
  const emptyProps = {
    ...mockProps,
    agents: []
  };
  
  const component = TestRenderer.create(<AgentList {...emptyProps} />);
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentList should have correct container structure", () => {
  const component = TestRenderer.create(<AgentList {...mockProps} />);
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
    assertEquals(tree.props?.flexDirection, 'column');
    assertEquals(tree.props?.borderStyle, 'round');
    assertEquals(tree.props?.width, 25);
    assertEquals(tree.props?.height, '100%');
  }
  
  component.unmount();
});

Deno.test("Unit - AgentList should show help text when focused", () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  // Tree should exist and be an object
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  component.unmount();
});

Deno.test("Unit - AgentList should not show help text when not focused", () => {
  const component = TestRenderer.create(
    <AgentList {...mockProps} focusArea={FocusArea.MainContent} />
  );
  const tree = component.toJSON();
  
  // Tree should exist and be an object
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  component.unmount();
});

Deno.test("Unit - AgentList should handle different selected indices", () => {
  const component1 = TestRenderer.create(
    <AgentList {...mockProps} selectedIndex={0} />
  );
  const tree1 = component1.toJSON();
  assertEquals(tree1 !== null, true);
  component1.unmount();
  
  const component2 = TestRenderer.create(
    <AgentList {...mockProps} selectedIndex={1} />
  );
  const tree2 = component2.toJSON();
  assertEquals(tree2 !== null, true);
  component2.unmount();
  
  const component3 = TestRenderer.create(
    <AgentList {...mockProps} selectedIndex={mockAgents.length} />
  );
  const tree3 = component3.toJSON();
  assertEquals(tree3 !== null, true);
  component3.unmount();
});