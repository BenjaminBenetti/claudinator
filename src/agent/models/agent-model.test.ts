import { assertEquals, assertNotEquals } from "@std/assert";
import { Agent, AgentStatus, createAgent, isValidAgent } from "./agent-model.ts";

Deno.test("Unit - createAgent should create valid agent with correct properties", () => {
  const name = "Test Agent";
  const agent = createAgent(name);
  
  assertEquals(agent.name, name);
  assertEquals(agent.status, AgentStatus.Idle);
  assertEquals(typeof agent.id, "string");
  assertEquals(agent.createdAt instanceof Date, true);
});

Deno.test("Unit - createAgent should generate unique IDs", () => {
  const agent1 = createAgent("Agent 1");
  const agent2 = createAgent("Agent 2");
  
  assertNotEquals(agent1.id, agent2.id);
});

Deno.test("Unit - isValidAgent should return true for valid agent", () => {
  const validAgent: Agent = {
    id: "test-id",
    name: "Test Agent",
    status: AgentStatus.Active,
    createdAt: new Date()
  };
  
  assertEquals(isValidAgent(validAgent), true);
});

Deno.test("Unit - isValidAgent should return false for invalid agent", () => {
  const invalidAgents = [
    null,
    undefined,
    {},
    { id: "test", name: "test" },
    { id: "test", name: "test", status: "invalid", createdAt: new Date() },
    { id: 123, name: "test", status: AgentStatus.Active, createdAt: new Date() },
    { id: "test", name: 123, status: AgentStatus.Active, createdAt: new Date() },
    { id: "test", name: "test", status: AgentStatus.Active, createdAt: "invalid" }
  ];
  
  invalidAgents.forEach(agent => {
    assertEquals(isValidAgent(agent), false);
  });
});

Deno.test("Unit - AgentStatus enum should contain all expected values", () => {
  assertEquals(AgentStatus.Active, "active");
  assertEquals(AgentStatus.Idle, "idle");
  assertEquals(AgentStatus.Running, "running");
  assertEquals(AgentStatus.Error, "error");
});

Deno.test("Unit - Agent should have correct interface structure", () => {
  const agent = createAgent("Test Agent");
  
  assertEquals(typeof agent.id, "string");
  assertEquals(typeof agent.name, "string");
  assertEquals(typeof agent.status, "string");
  assertEquals(agent.createdAt instanceof Date, true);
  assertEquals(Object.values(AgentStatus).includes(agent.status), true);
  assertEquals(agent.codespaceId, undefined);
});

Deno.test("Unit - createAgent should create agent with codespace ID", () => {
  const codespaceId = "test-codespace-123";
  const agent = createAgent("Test Agent", codespaceId);
  
  assertEquals(agent.name, "Test Agent");
  assertEquals(agent.status, AgentStatus.Idle);
  assertEquals(agent.codespaceId, codespaceId);
  assertEquals(typeof agent.id, "string");
  assertEquals(agent.createdAt instanceof Date, true);
});

Deno.test("Unit - isValidAgent should return true for agent with codespace ID", () => {
  const agent = createAgent("Test Agent", "codespace-123");
  assertEquals(isValidAgent(agent), true);
});

Deno.test("Unit - isValidAgent should return false for agent with invalid codespace ID", () => {
  const invalidAgent = {
    ...createAgent("Test Agent"),
    codespaceId: 123 // Should be string or undefined
  };
  assertEquals(isValidAgent(invalidAgent), false);
});