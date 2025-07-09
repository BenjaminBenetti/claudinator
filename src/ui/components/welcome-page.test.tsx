import { assertEquals } from "@std/assert";
import React from "react";
import TestRenderer from "react-test-renderer";
import { WelcomePage } from "./welcome-page.tsx";

Deno.test("Unit - WelcomePage should render without crashing", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should have correct structure", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'type' in tree) {
    assertEquals(tree.type, 'ink-box');
    assertEquals(tree.props?.style?.flexDirection, 'column');
    assertEquals(tree.props?.style?.alignItems, 'center');
    assertEquals(tree.props?.style?.justifyContent, 'center');
    assertEquals(tree.props?.style?.width, '100%');
  }
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should contain text elements", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that the welcome page contains the expected text
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("hope you have the Max plan"), true);
  assertEquals(jsonString.includes("Press Ctrl+C to exit"), true);
  
  // Clean up component to avoid timer leaks
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should contain title text", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that the ASCII art title is present
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("░█████╗░"), true); // First line of ASCII art
  assertEquals(jsonString.includes("╚═════╝░"), true); // Parts of the ASCII art
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should contain welcome message", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  assertEquals(tree !== null, true);
  assertEquals(typeof tree === 'object', true);
  
  // Check that the welcome message is present
  const jsonString = JSON.stringify(tree);
  assertEquals(jsonString.includes("I hope you have the Max plan"), true);
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should contain exit instructions", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'children' in tree && Array.isArray(tree.children)) {
    const exitChild = tree.children[2];
    if (typeof exitChild === 'object' && exitChild !== null && 'children' in exitChild && Array.isArray(exitChild.children)) {
      assertEquals(exitChild.children[0], 'Press Ctrl+C to exit');
    }
  }
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});