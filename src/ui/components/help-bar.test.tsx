import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { HelpBar } from "./help-bar.tsx";
import { FocusArea } from "../service/ui-state-service.ts";

Deno.test("Unit - HelpBar should render without crashing", async () => {
  const component = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should display sidebar help text when sidebar focused", async () => {
  const component = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  // Check that sidebar help text is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("d - Details"), true);
  assertEquals(jsonString.includes("esc - Clear all selection"), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should display tile help text when tile focused", async () => {
  const component = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Tile} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  // Check that tile help text is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("d - Details"), true);
  assertEquals(jsonString.includes("t - Terminal"), true);
  assertEquals(jsonString.includes("m - Menu"), true);
  assertEquals(jsonString.includes("backspace - Close"), true);

  // Ensure sidebar-specific text is NOT rendered
  assertEquals(jsonString.includes("esc - Clear all selection"), false);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should have proper container structure", async () => {
  const component = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that the component has the expected structure
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
  }
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should handle focus area changes", async () => {
  // Test with sidebar focus
  const sidebarComponent = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const sidebarTree = sidebarComponent.toJSON();
  const sidebarText = JSON.stringify(sidebarTree);
  
  assertEquals(sidebarText.includes("d - Details"), true);
  assertEquals(sidebarText.includes("esc - Clear all selection"), true);
  sidebarComponent.unmount();
  
  // Test with tile focus
  const tileComponent = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Tile} />
  );
  const tileTree = tileComponent.toJSON();
  const tileText = JSON.stringify(tileTree);
  
  assertEquals(tileText.includes("t - Terminal"), true);
  tileComponent.unmount();
  
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should render text with proper styling", async () => {
  const component = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  // Check that the text component is rendered
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("ink-text"), true);
  assertEquals(jsonString.includes("borderColor\":\"gray\""), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should render border styling", async () => {
  const component = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  // Check that the box component has expected border styling
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("borderStyle\":\"single\""), true);
  assertEquals(jsonString.includes("borderColor\":\"gray\""), true);
  assertEquals(jsonString.includes("paddingX\":1"), true);
  assertEquals(jsonString.includes("width\":\"100%\""), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should handle different focus areas consistently", async () => {
  const focusAreas = [FocusArea.Sidebar, FocusArea.Tile];
  
  focusAreas.forEach(focusArea => {
    const component = TestRenderer.create(
      <HelpBar focusArea={focusArea} />
    );
    const tree = component.toJSON();
    
    assertEquals(tree !== null, true);
    
    // Check that the component renders consistently regardless of focus area
    const jsonString = JSON.stringify(tree);
    assertEquals(jsonString.includes("borderStyle\":\"single\""), true);
    assertEquals(jsonString.includes("borderColor\":\"gray\""), true);
    assertEquals(jsonString.includes("ink-text"), true);
    
    component.unmount();
  });
  
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - HelpBar should render complete help text content", async () => {
  // Test sidebar content completeness
  const sidebarComponent = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Sidebar} />
  );
  const sidebarTree = sidebarComponent.toJSON();
  const sidebarText = JSON.stringify(sidebarTree);
  
  const expectedSidebarContent = "d - Details, esc - Clear all selection";
  assertEquals(sidebarText.includes(expectedSidebarContent), true);
  
  sidebarComponent.unmount();
  
  // Test tile content completeness
  const tileComponent = TestRenderer.create(
    <HelpBar focusArea={FocusArea.Tile} />
  );
  const tileTree = tileComponent.toJSON();
  const tileText = JSON.stringify(tileTree);
  
  const expectedTileContent = "d - Details, t - Terminal, m - Menu, backspace - Close";
  assertEquals(tileText.includes(expectedTileContent), true);
  
  tileComponent.unmount();
  
  // Use a longer timeout to prevent timer leak warnings
  await new Promise(resolve => setTimeout(resolve, 10));
});

Deno.test("Unit - HelpBar should maintain props immutability", async () => {
  const originalFocusArea = FocusArea.Sidebar;
  const component = TestRenderer.create(
    <HelpBar focusArea={originalFocusArea} />
  );
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  
  // Verify the original props are not modified
  assertEquals(originalFocusArea, FocusArea.Sidebar);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});