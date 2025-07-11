import React from "react";
import TestRenderer from "react-test-renderer";
import { assert } from "@std/assert";
import { ErrorModal } from "./error-modal.tsx";

Deno.test("ErrorModal - should not render when not visible", () => {
  const mockOnClose = () => {};
  const component = TestRenderer.create(
    <ErrorModal
      isVisible={false}
      message="Test error message"
      onClose={mockOnClose}
    />
  );

  assert(component.toJSON() === null);
});

Deno.test("ErrorModal - should render error message when visible", async () => {
  const mockOnClose = () => {};
  const component = TestRenderer.create(
    <ErrorModal
      isVisible
      message="Test error message"
      onClose={mockOnClose}
    />
  );

  const tree = component.toJSON();
  assert(tree !== null);
  const jsonOutput = JSON.stringify(tree);
  assert(jsonOutput.includes("Error"));
  assert(jsonOutput.includes("Test error message"));
  assert(jsonOutput.includes("Press Escape or Enter to close"));
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});

Deno.test("ErrorModal - should render with proper structure when visible", async () => {
  const mockOnClose = () => {};
  const component = TestRenderer.create(
    <ErrorModal
      isVisible
      message="Test error message"
      onClose={mockOnClose}
    />
  );

  const tree = component.toJSON();
  assert(tree !== null);
  
  const jsonOutput = JSON.stringify(tree);
  assert(jsonOutput.includes("ink-box"));
  assert(jsonOutput.includes("position\":\"absolute\""));
  assert(jsonOutput.includes("borderStyle\":\"round\""));
  assert(jsonOutput.includes("borderColor\":\"red\""));
  
  component.unmount();
  await new Promise(resolve => setTimeout(resolve, 0));
});