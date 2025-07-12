import { assertEquals } from "@std/assert";
import { AgentService, createAgentService } from "./agent-service.ts";
import { createAgentRepository } from "../repo/agent-repo.ts";
import { AgentStatus } from "../models/agent-model.ts";

Deno.test("Unit - AgentService should create agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");

  assertEquals(agent.name, "Test Agent");
  assertEquals(agent.status, AgentStatus.Idle);
  assertEquals(service.getAgentCount(), 1);
});

Deno.test("Unit - AgentService should list all agents", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  service.createAgent("Agent 1");
  service.createAgent("Agent 2");

  const agents = service.listAgents();

  assertEquals(agents.length, 2);
  assertEquals(agents.some((a) => a.name === "Agent 1"), true);
  assertEquals(agents.some((a) => a.name === "Agent 2"), true);
});

Deno.test("Unit - AgentService should get agent by ID", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const createdAgent = service.createAgent("Test Agent");
  const foundAgent = service.getAgent(createdAgent.id);

  assertEquals(foundAgent?.id, createdAgent.id);
  assertEquals(foundAgent?.name, "Test Agent");
});

Deno.test("Unit - AgentService should update agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  const updatedAgent = service.updateAgent(agent.id, {
    name: "Updated Agent",
    status: AgentStatus.Running,
  });

  assertEquals(updatedAgent?.name, "Updated Agent");
  assertEquals(updatedAgent?.status, AgentStatus.Running);
});

Deno.test("Unit - AgentService should delete agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");

  const deleted = service.deleteAgent(agent.id);

  assertEquals(deleted, true);
  assertEquals(service.getAgentCount(), 0);
});

Deno.test("Unit - AgentService should update agent status", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  const updatedAgent = service.updateAgentStatus(agent.id, AgentStatus.Running);

  assertEquals(updatedAgent?.status, AgentStatus.Running);
  assertEquals(updatedAgent?.id, agent.id);
});

Deno.test("Unit - AgentService should create agent with codespace ID", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const codespaceId = "test-codespace-123";
  const agent = service.createAgent("Test Agent", codespaceId);

  assertEquals(agent.name, "Test Agent");
  assertEquals(agent.codespaceId, codespaceId);
});

Deno.test("Unit - AgentService should link agent to codespace", async () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  const codespaceId = "test-codespace-123";

  const updatedAgent = await service.linkAgentToCodespace(
    agent.id,
    codespaceId,
  );

  assertEquals(updatedAgent?.codespaceId, codespaceId);
  assertEquals(updatedAgent?.id, agent.id);
});

Deno.test("Unit - AgentService should unlink agent from codespace", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent", "test-codespace-123");

  const updatedAgent = service.unlinkAgentFromCodespace(agent.id);

  assertEquals(updatedAgent?.codespaceId, undefined);
  assertEquals(updatedAgent?.id, agent.id);
});

Deno.test("Unit - AgentService should get agents by codespace", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const codespaceId = "test-codespace-123";
  const agent1 = service.createAgent("Agent 1", codespaceId);
  const agent2 = service.createAgent("Agent 2", "other-codespace");
  const agent3 = service.createAgent("Agent 3", codespaceId);

  const agentsInCodespace = service.getAgentsByCodespace(codespaceId);

  assertEquals(agentsInCodespace.length, 2);
  assertEquals(agentsInCodespace[0].id, agent1.id);
  assertEquals(agentsInCodespace[1].id, agent3.id);
});

Deno.test("Unit - AgentService should get agents without codespace", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent1 = service.createAgent("Agent 1", "test-codespace-123");
  const agent2 = service.createAgent("Agent 2");
  const agent3 = service.createAgent("Agent 3");

  const agentsWithoutCodespace = service.getAgentsWithoutCodespace();

  assertEquals(agentsWithoutCodespace.length, 2);
  assertEquals(agentsWithoutCodespace[0].id, agent2.id);
  assertEquals(agentsWithoutCodespace[1].id, agent3.id);
});

Deno.test("Unit - AgentService should check if agent linked to codespace", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const codespaceId = "test-codespace-123";
  service.createAgent("Agent 1", codespaceId);
  service.createAgent("Agent 2");

  assertEquals(service.hasAgentLinkedToCodespace(codespaceId), true);
  assertEquals(service.hasAgentLinkedToCodespace("non-existent"), false);
});
