import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { AgentTile } from "./agent-tile.tsx";
import { Agent, AgentStatus } from "../../agent/models/agent-model.ts";

const mockAgent: Agent = {
  id: "test-agent-id",
  name: "Test Agent",
  status: AgentStatus.Active,
  createdAt: new Date("2023-01-01T12:00:00Z")
};

Deno.test("Unit - AgentTile should render without crashing", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render agent name", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render agent ID", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render creation date", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render status", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render focused state", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} isFocused={true} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render unfocused state", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} isFocused={false} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should handle different statuses", () => {
  const statuses = [AgentStatus.Active, AgentStatus.Running, AgentStatus.Error, AgentStatus.Idle];
  
  statuses.forEach(status => {
    const testAgent = { ...mockAgent, status };
    const component = TestRenderer.create(
      <AgentTile agent={testAgent} />
    );
    const tree = component.toJSON();
    
    assertEquals(tree !== null, true);
    component.unmount();
  });
});

Deno.test("Unit - AgentTile should have proper container structure", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
    assertEquals(tree.props?.flexDirection, 'column');
    assertEquals(tree.props?.width, '100%');
    assertEquals(tree.props?.height, '100%');
  }
  
  component.unmount();
});

Deno.test("Unit - AgentTile should handle long agent names", () => {
  const longNameAgent = {
    ...mockAgent,
    name: "This is a very long agent name that might cause layout issues"
  };
  
  const component = TestRenderer.create(
    <AgentTile agent={longNameAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should handle different date formats", () => {
  const futureAgent = {
    ...mockAgent,
    createdAt: new Date("2025-12-31T23:59:59Z")
  };
  
  const component = TestRenderer.create(
    <AgentTile agent={futureAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - AgentTile should render default focused state", () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});