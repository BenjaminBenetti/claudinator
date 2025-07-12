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

Deno.test("Unit - AgentService should delete agent and remove from selection", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  service.selectAgent(agent.id);

  assertEquals(service.isAgentSelected(agent.id), true);

  const deleted = service.deleteAgent(agent.id);

  assertEquals(deleted, true);
  assertEquals(service.getAgentCount(), 0);
  assertEquals(service.isAgentSelected(agent.id), false);
});

Deno.test("Unit - AgentService should select agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  const selected = service.selectAgent(agent.id);

  assertEquals(selected, true);
  assertEquals(service.isAgentSelected(agent.id), true);
  assertEquals(service.getSelectedAgentCount(), 1);
});

Deno.test("Unit - AgentService should not select non-existent agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const selected = service.selectAgent("non-existent-id");

  assertEquals(selected, false);
  assertEquals(service.getSelectedAgentCount(), 0);
});

Deno.test("Unit - AgentService should deselect agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  service.selectAgent(agent.id);

  assertEquals(service.isAgentSelected(agent.id), true);

  service.deselectAgent(agent.id);

  assertEquals(service.isAgentSelected(agent.id), false);
  assertEquals(service.getSelectedAgentCount(), 0);
});

Deno.test("Unit - AgentService should toggle agent selection", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");

  // Toggle to select
  const selected = service.toggleAgentSelection(agent.id);
  assertEquals(selected, true);
  assertEquals(service.isAgentSelected(agent.id), true);

  // Toggle to deselect
  const deselected = service.toggleAgentSelection(agent.id);
  assertEquals(deselected, false);
  assertEquals(service.isAgentSelected(agent.id), false);
});

Deno.test("Unit - AgentService should not toggle non-existent agent", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const result = service.toggleAgentSelection("non-existent-id");

  assertEquals(result, false);
  assertEquals(service.getSelectedAgentCount(), 0);
});

Deno.test("Unit - AgentService should get selected agents", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent1 = service.createAgent("Agent 1");
  const agent2 = service.createAgent("Agent 2");
  const agent3 = service.createAgent("Agent 3");

  service.selectAgent(agent1.id);
  service.selectAgent(agent3.id);

  const selectedAgents = service.getSelectedAgents();

  assertEquals(selectedAgents.length, 2);
  assertEquals(selectedAgents.some((a) => a.id === agent1.id), true);
  assertEquals(selectedAgents.some((a) => a.id === agent3.id), true);
  assertEquals(selectedAgents.some((a) => a.id === agent2.id), false);
});

Deno.test("Unit - AgentService should get selected agent IDs", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent1 = service.createAgent("Agent 1");
  const agent2 = service.createAgent("Agent 2");

  service.selectAgent(agent1.id);
  service.selectAgent(agent2.id);

  const selectedIds = service.getSelectedAgentIds();

  assertEquals(selectedIds.length, 2);
  assertEquals(selectedIds.includes(agent1.id), true);
  assertEquals(selectedIds.includes(agent2.id), true);
});

Deno.test("Unit - AgentService should clear selected agents", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent1 = service.createAgent("Agent 1");
  const agent2 = service.createAgent("Agent 2");

  service.selectAgent(agent1.id);
  service.selectAgent(agent2.id);

  assertEquals(service.getSelectedAgentCount(), 2);

  service.clearSelectedAgents();

  assertEquals(service.getSelectedAgentCount(), 0);
  assertEquals(service.getSelectedAgents().length, 0);
});

Deno.test("Unit - AgentService should update agent status", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent = service.createAgent("Test Agent");
  const updatedAgent = service.updateAgentStatus(agent.id, AgentStatus.Running);

  assertEquals(updatedAgent?.status, AgentStatus.Running);
  assertEquals(updatedAgent?.id, agent.id);
});

Deno.test("Unit - AgentService should handle deleted agents in selection", () => {
  const repo = createAgentRepository();
  const service = createAgentService(repo);

  const agent1 = service.createAgent("Agent 1");
  const agent2 = service.createAgent("Agent 2");

  service.selectAgent(agent1.id);
  service.selectAgent(agent2.id);

  // Delete agent1
  service.deleteAgent(agent1.id);

  const selectedAgents = service.getSelectedAgents();

  assertEquals(selectedAgents.length, 1);
  assertEquals(selectedAgents[0].id, agent2.id);
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

  const updatedAgent = await service.linkAgentToCodespace(agent.id, codespaceId);

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
