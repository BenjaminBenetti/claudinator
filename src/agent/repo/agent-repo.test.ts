import { assertEquals, assertNotEquals } from "@std/assert";
import { AgentRepository, createAgentRepository } from "./agent-repo.ts";
import { Agent, AgentStatus, createAgent } from "../models/agent-model.ts";

Deno.test("Unit - AgentRepository should create and store agent", () => {
  const repo = createAgentRepository();
  const agent = createAgent("Test Agent");
  
  const createdAgent = repo.create(agent);
  
  assertEquals(createdAgent.id, agent.id);
  assertEquals(createdAgent.name, agent.name);
  assertEquals(createdAgent.status, agent.status);
  assertEquals(repo.size(), 1);
});

Deno.test("Unit - AgentRepository should return all agents", () => {
  const repo = createAgentRepository();
  const agent1 = createAgent("Agent 1");
  const agent2 = createAgent("Agent 2");
  
  repo.create(agent1);
  repo.create(agent2);
  
  const allAgents = repo.getAll();
  
  assertEquals(allAgents.length, 2);
  assertEquals(allAgents.some(a => a.id === agent1.id), true);
  assertEquals(allAgents.some(a => a.id === agent2.id), true);
});

Deno.test("Unit - AgentRepository should return agent by ID", () => {
  const repo = createAgentRepository();
  const agent = createAgent("Test Agent");
  
  repo.create(agent);
  
  const foundAgent = repo.getById(agent.id);
  
  assertEquals(foundAgent?.id, agent.id);
  assertEquals(foundAgent?.name, agent.name);
  assertEquals(foundAgent?.status, agent.status);
});

Deno.test("Unit - AgentRepository should return undefined for non-existent agent", () => {
  const repo = createAgentRepository();
  
  const foundAgent = repo.getById("non-existent-id");
  
  assertEquals(foundAgent, undefined);
});

Deno.test("Unit - AgentRepository should update existing agent", () => {
  const repo = createAgentRepository();
  const agent = createAgent("Test Agent");
  
  repo.create(agent);
  
  const updatedAgent = repo.update(agent.id, { 
    name: "Updated Agent",
    status: AgentStatus.Running
  });
  
  assertEquals(updatedAgent?.name, "Updated Agent");
  assertEquals(updatedAgent?.status, AgentStatus.Running);
  assertEquals(updatedAgent?.id, agent.id);
});

Deno.test("Unit - AgentRepository should return undefined when updating non-existent agent", () => {
  const repo = createAgentRepository();
  
  const updatedAgent = repo.update("non-existent-id", { name: "Updated" });
  
  assertEquals(updatedAgent, undefined);
});

Deno.test("Unit - AgentRepository should delete agent", () => {
  const repo = createAgentRepository();
  const agent = createAgent("Test Agent");
  
  repo.create(agent);
  assertEquals(repo.size(), 1);
  
  const deleted = repo.delete(agent.id);
  
  assertEquals(deleted, true);
  assertEquals(repo.size(), 0);
  assertEquals(repo.getById(agent.id), undefined);
});

Deno.test("Unit - AgentRepository should return false when deleting non-existent agent", () => {
  const repo = createAgentRepository();
  
  const deleted = repo.delete("non-existent-id");
  
  assertEquals(deleted, false);
});

Deno.test("Unit - AgentRepository should clear all agents", () => {
  const repo = createAgentRepository();
  
  repo.create(createAgent("Agent 1"));
  repo.create(createAgent("Agent 2"));
  assertEquals(repo.size(), 2);
  
  repo.clear();
  
  assertEquals(repo.size(), 0);
  assertEquals(repo.getAll().length, 0);
});

Deno.test("Unit - AgentRepository should return immutable copies", () => {
  const repo = createAgentRepository();
  const agent = createAgent("Test Agent");
  
  repo.create(agent);
  
  const retrievedAgent = repo.getById(agent.id);
  const allAgents = repo.getAll();
  
  // Modify retrieved objects
  if (retrievedAgent) {
    retrievedAgent.name = "Modified Name";
  }
  allAgents[0].name = "Modified Name";
  
  // Original data should remain unchanged
  const freshAgent = repo.getById(agent.id);
  assertEquals(freshAgent?.name, "Test Agent");
});

Deno.test("Unit - AgentRepository should preserve ID on update", () => {
  const repo = createAgentRepository();
  const agent = createAgent("Test Agent");
  
  repo.create(agent);
  
  const updatedAgent = repo.update(agent.id, { 
    id: "different-id",
    name: "Updated Agent"
  });
  
  assertEquals(updatedAgent?.id, agent.id);
  assertEquals(updatedAgent?.name, "Updated Agent");
});