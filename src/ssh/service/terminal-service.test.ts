import { assertEquals, assertThrows } from "@std/assert";
import { TerminalService, TerminalServiceError } from "./terminal-service.ts";
import type { TerminalSize } from "../models/terminal-state-model.ts";
import { DEFAULT_TERMINAL_SIZE } from "../models/terminal-state-model.ts";
import type { ISSHConnectionService } from "./ssh-connection-service.ts";
import type {
  ITTYService,
  TTYBufferChangeCallback,
} from "../../tty/service/tty-service.ts";
import type { TTYBuffer } from "../../tty/models/tty-buffer-model.ts";
import { createTTYBuffer } from "../../tty/models/tty-buffer-model.ts";
import {
  createSSHSession,
  SSHSessionStatus,
} from "../models/ssh-session-model.ts";

// Mock TTY Service for testing
class MockTTYService implements ITTYService {
  private buffers = new Map<string, TTYBuffer>();
  private callbacks = new Map<string, TTYBufferChangeCallback>();

  createTTYBuffer(
    sessionId: string,
    cols?: number,
    rows?: number,
    onBufferChange?: TTYBufferChangeCallback,
  ): TTYBuffer {
    const buffer = createTTYBuffer(sessionId, cols || 80, rows || 24);
    this.buffers.set(sessionId, buffer);
    if (onBufferChange) {
      this.callbacks.set(sessionId, onBufferChange);
    }
    return buffer;
  }

  processOutput(sessionId: string, data: string): void {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) return;

    // Simple mock: split on newlines and add to buffer
    const lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        // New line
        buffer.cursor.row++;
        buffer.cursor.col = 0;
      }
      // Add characters to current line (simplified)
      lines[i]; // Just process the line
    }

    const callback = this.callbacks.get(sessionId);
    if (callback) {
      callback(sessionId, buffer);
    }
  }

  getTTYBuffer(sessionId: string): TTYBuffer | undefined {
    return this.buffers.get(sessionId);
  }

  getVisibleLines(sessionId: string): string[] {
    const buffer = this.buffers.get(sessionId);
    if (!buffer) return [];

    // Return simple mock lines
    return ["Mock line 1", "Mock line 2", "Mock line 3"];
  }

  resizeTerminal(sessionId: string, cols: number, rows: number): void {
    const buffer = this.buffers.get(sessionId);
    if (buffer) {
      buffer.size.cols = cols;
      buffer.size.rows = rows;
    }
  }

  clearBuffer(sessionId: string, clearType?: number): void {
    const buffer = this.buffers.get(sessionId);
    if (buffer) {
      buffer.primaryBuffer.lines = [];
      buffer.cursor.row = 0;
      buffer.cursor.col = 0;
    }
  }

  removeTTYBuffer(sessionId: string): void {
    this.buffers.delete(sessionId);
    this.callbacks.delete(sessionId);
  }

  getVisibleLinesWithIndices(
    sessionId: string,
  ): Array<{ lineIndex: number; lineText: string }> {
    const lines = this.getVisibleLines(sessionId);
    return lines.map((lineText, index) => ({ lineIndex: index, lineText }));
  }
}

// Mock SSH Connection Service for testing
class MockSSHConnectionService implements ISSHConnectionService {
  private outputStreams = new Map<string, ReadableStream<string>>();

  async connectToCodespace(): Promise<any> {
    return createSSHSession("agent1", "codespace1");
  }

  async sendKeystroke(): Promise<void> {
    // Mock implementation
  }

  async resizeTerminal(): Promise<void> {
    // Mock implementation
  }

  getOutputStream(sessionId: string): ReadableStream<string> {
    let stream = this.outputStreams.get(sessionId);
    if (!stream) {
      stream = new ReadableStream<string>({
        start(controller) {
          controller.enqueue("Mock output");
          controller.close();
        },
      });
      this.outputStreams.set(sessionId, stream);
    }
    return stream;
  }

  async disconnectSession(): Promise<void> {
    // Mock implementation
  }

  getSessionStatus(): SSHSessionStatus {
    return SSHSessionStatus.Connected;
  }

  getActiveSessions(): any[] {
    return [];
  }
}

Deno.test("Terminal Service Tests", async (t) => {
  await t.step("should create terminal service with TTY service", () => {
    const mockTTY = new MockTTYService();
    const service = new TerminalService(mockTTY);
    assertEquals(typeof service.createTerminalState, "function");
  });

  await t.step("should create terminal state with default size", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    const state = service.createTerminalState("session1", mockSSH);
    assertEquals(state.sessionId, "session1");
    assertEquals(state.cols, DEFAULT_TERMINAL_SIZE.cols);
    assertEquals(state.rows, DEFAULT_TERMINAL_SIZE.rows);
  });

  await t.step("should create terminal state with custom size", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    const customSize: TerminalSize = { cols: 120, rows: 30 };
    const state = service.createTerminalState("session1", mockSSH, customSize);
    assertEquals(state.cols, 120);
    assertEquals(state.rows, 30);
  });

  await t.step("should append output to terminal", () => {
    const mockTTY = new MockTTYService();
    const service = new TerminalService(mockTTY);

    // Create a terminal state first
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH);

    // This should not throw
    service.appendOutput("session1", "test output");
  });

  await t.step(
    "should throw error when appending to non-existent session",
    () => {
      const mockTTY = new MockTTYService();
      const service = new TerminalService(mockTTY);

      assertThrows(
        () => service.appendOutput("non-existent", "test"),
        TerminalServiceError,
        "Terminal state not found for session: non-existent",
      );
    },
  );

  await t.step("should get terminal state", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    const state = service.createTerminalState("session1", mockSSH);
    const retrieved = service.getTerminalState("session1");
    assertEquals(retrieved, state);
  });

  await t.step("should update terminal size", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    service.createTerminalState("session1", mockSSH);
    service.updateTerminalSize("session1", { cols: 100, rows: 25 });

    const state = service.getTerminalState("session1");
    assertEquals(state?.cols, 100);
    assertEquals(state?.rows, 25);
  });

  await t.step("should get visible lines", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    service.createTerminalState("session1", mockSSH);
    const lines = service.getVisibleLines("session1");
    assertEquals(Array.isArray(lines), true);
    assertEquals(lines.length > 0, true);
  });

  await t.step("should clear buffer", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    service.createTerminalState("session1", mockSSH);
    service.clearBuffer("session1");
    // Should not throw
  });

  await t.step("should remove terminal state", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    service.createTerminalState("session1", mockSSH);
    service.removeTerminalState("session1");

    const state = service.getTerminalState("session1");
    assertEquals(state, undefined);
  });

  await t.step("should calculate terminal size", () => {
    const mockTTY = new MockTTYService();
    const service = new TerminalService(mockTTY);

    const size = service.calculateTerminalSize(100, 30);
    assertEquals(size.cols, 100);
    assertEquals(size.rows, 30);
  });

  await t.step("should handle scroll operations", () => {
    const mockTTY = new MockTTYService();
    const mockSSH = new MockSSHConnectionService();
    const service = new TerminalService(mockTTY);

    service.createTerminalState("session1", mockSSH);

    // These should not throw
    service.scrollUp("session1", 1);
    service.scrollDown("session1", 1);
  });
});
