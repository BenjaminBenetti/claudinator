import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { MainApplicationPage } from "./main-application-page.tsx";
import { createAgentService } from "../../agent/service/agent-service.ts";
import { createAgentRepository } from "../../agent/repo/agent-repo.ts";
import { createUIStateService } from "../service/ui-state-service.ts";

const createMockServices = () => {
  const agentRepository = createAgentRepository();
  const agentService = createAgentService(agentRepository);
  const uiStateService = createUIStateService();
  
  return { agentService, uiStateService };
};

Deno.test("Unit - MainApplicationPage should render without crashing", () => {
  const { agentService, uiStateService } = createMockServices();
  
  const component = TestRenderer.create(
    <MainApplicationPage 
      agentService={agentService}
      uiStateService={uiStateService}
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should render with empty agents list", () => {
  const { agentService, uiStateService } = createMockServices();
  
  const component = TestRenderer.create(
    <MainApplicationPage 
      agentService={agentService}
      uiStateService={uiStateService}
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
    assertEquals(tree.props?.flexDirection, 'row');
    assertEquals(tree.props?.width, '100%');
    assertEquals(tree.props?.height, '100%');
  }
  
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should render with agents", () => {
  const { agentService, uiStateService } = createMockServices();
  
  // Add some agents
  agentService.createAgent("Test Agent 1");
  agentService.createAgent("Test Agent 2");
  
  const component = TestRenderer.create(
    <MainApplicationPage 
      agentService={agentService}
      uiStateService={uiStateService}
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should render with selected agents", () => {
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
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should have proper container structure", () => {
  const { agentService, uiStateService } = createMockServices();
  
  const component = TestRenderer.create(
    <MainApplicationPage 
      agentService={agentService}
      uiStateService={uiStateService}
    />
  );
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
    assertEquals(tree.props?.flexDirection, 'row');
  }
  
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should handle services initialization", () => {
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
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should handle different UI states", () => {
  const { agentService, uiStateService } = createMockServices();
  
  // Test different focus areas
  const focusAreas = ['sidebar', 'main-content', 'tile'];
  
  focusAreas.forEach(area => {
    // Reset state
    uiStateService.resetState();
    
    const component = TestRenderer.create(
      <MainApplicationPage 
        agentService={agentService}
        uiStateService={uiStateService}
      />
    );
    const tree = component.toJSON();
    
    assertEquals(tree !== null, true);
    component.unmount();
  });
});

Deno.test("Unit - MainApplicationPage should handle agent operations", () => {
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
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should handle edge cases", () => {
  const { agentService, uiStateService } = createMockServices();
  
  // Test with maximum realistic number of agents
  for (let i = 0; i < 10; i++) {
    agentService.createAgent(`Agent ${i + 1}`);
  }
  
  const component = TestRenderer.create(
    <MainApplicationPage 
      agentService={agentService}
      uiStateService={uiStateService}
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});

Deno.test("Unit - MainApplicationPage should handle state synchronization", () => {
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
    />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
});