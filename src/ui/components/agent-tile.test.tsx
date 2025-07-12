import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { AgentTile } from "./agent-tile.tsx";
import { Agent, AgentStatus } from "../../agent/models/agent-model.ts";

const mockAgent: Agent = {
  id: "test-agent-id",
  name: "Test Agent",
  status: AgentStatus.Active,
  createdAt: new Date("2023-01-01T12:00:00Z"),
};

Deno.test("Unit - AgentTile should render without crashing", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render agent name", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that agent name is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes(mockAgent.name), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render agent ID", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that agent ID is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes(mockAgent.id), true);
  assertEquals(jsonString.includes("ID:"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render creation date", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that creation date is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Created:"), true);
  assertEquals(jsonString.includes("2023"), true); // Year from mock date

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render status", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that status is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Active"), true);
  assertEquals(jsonString.includes("●"), true); // Active status symbol

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render focused state", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} isFocused />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that focused state is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Focused"), true);
  assertEquals(jsonString.includes("arrow keys"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render unfocused state", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} isFocused={false} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that focused state is NOT rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Focused"), false);
  assertEquals(jsonString.includes("arrow keys"), false);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should handle different statuses", async () => {
  const statuses = [
    AgentStatus.Active,
    AgentStatus.Running,
    AgentStatus.Error,
    AgentStatus.Idle,
  ];
  const expectedText = ["Active", "Running", "Error", "Idle"];
  const expectedSymbols = ["●", "▶", "✗", "○"];

  statuses.forEach((status, index) => {
    const testAgent = { ...mockAgent, status };
    const component = TestRenderer.create(
      <AgentTile agent={testAgent} />,
    );
    const tree = component.toJSON();

    assertEquals(tree !== null, true);

    // Check that the correct status text and symbol are rendered
    const jsonString = JSON.stringify(tree);
    assertEquals(jsonString.includes(expectedText[index]), true);
    assertEquals(jsonString.includes(expectedSymbols[index]), true);

    component.unmount();
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should have proper container structure", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);
  assertEquals(typeof tree === "object", true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should handle long agent names", async () => {
  const longNameAgent = {
    ...mockAgent,
    name: "This is a very long agent name that might cause layout issues",
  };

  const component = TestRenderer.create(
    <AgentTile agent={longNameAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that the long name is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes(longNameAgent.name), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should handle different date formats", async () => {
  const futureAgent = {
    ...mockAgent,
    createdAt: new Date("2025-12-31T23:59:59Z"),
  };

  const component = TestRenderer.create(
    <AgentTile agent={futureAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that the future date is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("2025"), true);
  assertEquals(jsonString.includes("Created:"), true);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Unit - AgentTile should render default focused state", async () => {
  const component = TestRenderer.create(
    <AgentTile agent={mockAgent} />,
  );
  const tree = component.toJSON();

  assertEquals(tree !== null, true);

  // Check that default focused state is false (no focus indicators)
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("Focused"), false);
  assertEquals(jsonString.includes("arrow keys"), false);

  component.unmount();
  await new Promise((resolve) => setTimeout(resolve, 0));
});
