import React from "react";
import { assertEquals } from "@std/assert";
import TestRenderer from "react-test-renderer";
import { TTYTerminal } from "./tty-terminal.tsx";
import { createTTYService } from "../../tty/service/tty-service.ts";
import type { ITTYService } from "../../tty/service/tty-service.ts";

// Test helper to create a mock TTY service with data
function createMockTTYServiceWithData(
  sessionId: string,
  lines: string[],
): ITTYService {
  const service = createTTYService();
  const buffer = service.createTTYBuffer(sessionId, 80, 24);

  // Process the lines as terminal output
  for (const line of lines) {
    service.processOutput(sessionId, line + "\n");
  }

  return service;
}

// Test helper to create a TTY service with ANSI sequences
function createMockTTYServiceWithANSI(
  sessionId: string,
  ansiText: string,
): ITTYService {
  const service = createTTYService();
  service.createTTYBuffer(sessionId, 80, 24);
  service.processOutput(sessionId, ansiText);
  return service;
}

Deno.test("TTY Terminal Component Tests", async (t) => {
  await t.step("should render without crashing", () => {
    const ttyService = createTTYService();
    const sessionId = "test-session";
    ttyService.createTTYBuffer(sessionId);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
        isFocused={false}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should render with simple text output", () => {
    const sessionId = "test-session";
    const lines = ["Hello World", "Line 2", "Line 3"];
    const ttyService = createMockTTYServiceWithData(sessionId, lines);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle non-existent session", () => {
    const ttyService = createTTYService();
    const sessionId = "non-existent";

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle maxLines prop", () => {
    const sessionId = "test-session";
    const lines = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5"];
    const ttyService = createMockTTYServiceWithData(sessionId, lines);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
        maxLines={3}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle ANSI color sequences", () => {
    const sessionId = "test-session";
    const ansiText = "\\x1b[31mRed Text\\x1b[0m\\x1b[32mGreen Text\\x1b[0m";
    const ttyService = createMockTTYServiceWithANSI(sessionId, ansiText);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle cursor display", () => {
    const sessionId = "test-session";
    const ttyService = createTTYService();
    ttyService.createTTYBuffer(sessionId);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
        showCursor={true}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle focus state", () => {
    const sessionId = "test-session";
    const ttyService = createTTYService();
    ttyService.createTTYBuffer(sessionId);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
        isFocused={true}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle custom dimensions", () => {
    const sessionId = "test-session";
    const ttyService = createTTYService();
    ttyService.createTTYBuffer(sessionId);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
        width={120}
        height={30}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle screen clearing operations", () => {
    const sessionId = "test-session";
    const ttyService = createTTYService();
    ttyService.createTTYBuffer(sessionId);

    // Add some content then clear
    ttyService.processOutput(sessionId, "Line 1\\nLine 2\\nLine 3");
    ttyService.processOutput(sessionId, "\\x1b[2J"); // Clear screen
    ttyService.processOutput(sessionId, "After Clear");

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });

  await t.step("should handle TTY service functionality", () => {
    const sessionId = "test-session";
    const ttyService = createTTYService();
    ttyService.createTTYBuffer(sessionId);

    // Test that TTY service methods work
    const buffer = ttyService.getTTYBuffer(sessionId);
    assertEquals(buffer !== undefined, true);

    const visibleLines = ttyService.getVisibleLines(sessionId);
    assertEquals(Array.isArray(visibleLines), true);

    const component = TestRenderer.create(
      <TTYTerminal
        ttyService={ttyService}
        sessionId={sessionId}
      />,
    );

    const tree = component.toJSON();
    assertEquals(tree !== null, true);

    component.unmount();
  });
});
