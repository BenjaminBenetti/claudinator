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

Deno.test("Unit - WelcomePage should contain three text elements", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'children' in tree && Array.isArray(tree.children)) {
    assertEquals(tree.children.length, 3);
    
    // Check that all children are ink-text elements
    for (const child of tree.children) {
      if (typeof child === 'object' && child !== null && 'type' in child) {
        assertEquals(child.type, 'ink-text');
      }
    }
  }
  
  // Clean up component to avoid timer leaks
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should contain title text", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'children' in tree && Array.isArray(tree.children)) {
    const titleChild = tree.children[0];
    if (typeof titleChild === 'object' && titleChild !== null && 'children' in titleChild && Array.isArray(titleChild.children)) {
      assertEquals(titleChild.children[0], '🦕 Claudinator');
    }
  }
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("Unit - WelcomePage should contain welcome message", async () => {
  const component = TestRenderer.create(<WelcomePage />);
  const tree = component.toJSON();
  
  if (tree && typeof tree === 'object' && 'children' in tree && Array.isArray(tree.children)) {
    const messageChild = tree.children[1];
    if (typeof messageChild === 'object' && messageChild !== null && 'children' in messageChild && Array.isArray(messageChild.children)) {
      assertEquals(messageChild.children[0], 'Welcome to your CLI application!');
    }
  }
  
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