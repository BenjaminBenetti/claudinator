import { assertEquals, assertThrows } from "@std/assert";
import { TerminalService, TerminalServiceError } from "./terminal-service.ts";
import type { TerminalSize } from "../models/terminal-state-model.ts";
import { DEFAULT_TERMINAL_SIZE } from "../models/terminal-state-model.ts";
import type { ISSHConnectionService } from "./ssh-connection-service.ts";
import type { ITTYService } from "../../tty/service/tty-service.ts";
import type {
  TTYAppendResult,
  TTYBufferConfig,
} from "../../tty/models/tty-buffer-model.ts";
import {
  createSSHSession,
  SSHSessionStatus,
} from "../models/ssh-session-model.ts";

// Mock TTY Service for testing
class MockTTYService implements ITTYService {
  appendOutput(
    buffer: string[],
    output: string,
    _config?: TTYBufferConfig,
  ): TTYAppendResult {
    // Simple mock: just split on \n and append (mirrors old behavior)
    const lines = output.split("\n");
    const updatedBuffer = [...buffer];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && updatedBuffer.length > 0) {
        const lastIndex = updatedBuffer.length - 1;
        updatedBuffer[lastIndex] += line;
      } else {
        updatedBuffer.push(line);
      }
    }

    return {
      updatedBuffer,
      wasTrimmed: false,
      linesRemoved: 0,
    };
  }

  createBufferState() {
    return {
      buffer: [],
      config: { maxBufferLines: 1000, handleCarriageReturn: true },
    };
  }
}

// Mock SSH Connection Service for testing
class MockSSHConnectionService implements ISSHConnectionService {
  private outputStreams = new Map<string, ReadableStream<string>>();

  async connectToCodespace(
    agentId: string,
    codespaceId: string,
    _terminalSize: TerminalSize,
  ) {
    return createSSHSession(agentId, codespaceId);
  }

  async sendKeystroke(_sessionId: string, _keystroke: string) {
    throw new Error("Not implemented in mock");
  }

  async resizeTerminal(_sessionId: string, _size: TerminalSize) {
    throw new Error("Not implemented in mock");
  }

  getOutputStream(sessionId: string): ReadableStream<string> {
    let stream = this.outputStreams.get(sessionId);
    if (!stream) {
      // Create a simple readable stream that doesn't emit anything
      stream = new ReadableStream<string>({
        start(_controller) {
          // Keep the stream open but don't emit anything for tests
        },
      });
      this.outputStreams.set(sessionId, stream);
    }
    return stream;
  }

  async disconnectSession(_sessionId: string) {
    throw new Error("Not implemented in mock");
  }

  getSessionStatus(_sessionId: string) {
    return SSHSessionStatus.Connected;
  }

  getActiveSessions() {
    return [];
  }
}

Deno.test("TerminalService", async (t) => {
  await t.step("should create terminal service", () => {
    const service = new TerminalService();
    assertEquals(typeof service.createTerminalState, "function");
    assertEquals(typeof service.appendOutput, "function");
    assertEquals(typeof service.getTerminalState, "function");
  });

  await t.step("should create terminal state with default size", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    const state = service.createTerminalState(
      "session1",
      mockSSH,
      new MockTTYService(),
    );

    assertEquals(state.sessionId, "session1");
    assertEquals(state.outputBuffer.length, 0);
    assertEquals(state.scrollPosition, 0);
    assertEquals(state.cols, DEFAULT_TERMINAL_SIZE.cols);
    assertEquals(state.rows, DEFAULT_TERMINAL_SIZE.rows);
    assertEquals(state.maxBufferLines, 1000);
  });

  await t.step("should create terminal state with custom size", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    const customSize: TerminalSize = { cols: 120, rows: 30 };
    const state = service.createTerminalState(
      "session1",
      mockSSH,
      new MockTTYService(),
      customSize,
    );

    assertEquals(state.cols, 120);
    assertEquals(state.rows, 30);
  });

  await t.step("should append output to terminal buffer", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH, new MockTTYService());

    service.appendOutput("session1", "Hello World\nSecond Line");

    const updatedState = service.getTerminalState("session1");
    assertEquals(updatedState?.outputBuffer.length, 2);
    assertEquals(updatedState?.outputBuffer[0], "Hello World");
    assertEquals(updatedState?.outputBuffer[1], "Second Line");
  });

  await t.step("should handle single line output correctly", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH, new MockTTYService());

    service.appendOutput("session1", "First");
    service.appendOutput("session1", " Second");

    const state = service.getTerminalState("session1");
    assertEquals(state?.outputBuffer.length, 1);
    assertEquals(state?.outputBuffer[0], "First Second");
  });

  await t.step("should trim buffer when exceeding max lines", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    const customSize: TerminalSize = { cols: 80, rows: 24 };
    service.createTerminalState(
      "session1",
      mockSSH,
      new MockTTYService(),
      customSize,
    );

    // Manually set a small max buffer for testing
    const state = service.getTerminalState("session1");
    if (state) {
      state.maxBufferLines = 3;
    }

    service.appendOutput("session1", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

    const updatedState = service.getTerminalState("session1");
    assertEquals(updatedState?.outputBuffer.length, 3);
    assertEquals(updatedState?.outputBuffer[0], "Line 3");
    assertEquals(updatedState?.outputBuffer[2], "Line 5");
  });

  await t.step(
    "should throw error when appending to non-existent session",
    () => {
      const service = new TerminalService();

      assertThrows(
        () => service.appendOutput("invalid-session", "test"),
        TerminalServiceError,
        "Terminal state not found for session",
      );
    },
  );

  await t.step("should update terminal size", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH, new MockTTYService());

    const newSize: TerminalSize = { cols: 120, rows: 40 };
    service.updateTerminalSize("session1", newSize);

    const state = service.getTerminalState("session1");
    assertEquals(state?.cols, 120);
    assertEquals(state?.rows, 40);
  });

  await t.step(
    "should throw error when updating size for non-existent session",
    () => {
      const service = new TerminalService();
      const newSize: TerminalSize = { cols: 120, rows: 40 };

      assertThrows(
        () => service.updateTerminalSize("invalid-session", newSize),
        TerminalServiceError,
        "Terminal state not found for session",
      );
    },
  );

  await t.step("should scroll up correctly", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH, new MockTTYService());

    // Add some content
    service.appendOutput("session1", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

    service.scrollUp("session1", 2);

    const state = service.getTerminalState("session1");
    assertEquals(state?.scrollPosition, 0); // Can't scroll above 0
  });

  await t.step("should scroll down correctly", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    const customSize: TerminalSize = { cols: 80, rows: 2 };
    service.createTerminalState(
      "session1",
      mockSSH,
      new MockTTYService(),
      customSize,
    );

    // Add content that exceeds terminal height
    service.appendOutput("session1", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

    service.scrollDown("session1", 1);

    const state = service.getTerminalState("session1");
    assertEquals(state?.scrollPosition, 1);
  });

  await t.step("should get visible lines correctly", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    const customSize: TerminalSize = { cols: 80, rows: 3 };
    service.createTerminalState(
      "session1",
      mockSSH,
      new MockTTYService(),
      customSize,
    );

    service.appendOutput("session1", "Line 1\nLine 2\nLine 3\nLine 4\nLine 5");

    const visibleLines = service.getVisibleLines("session1");
    assertEquals(visibleLines.length, 3); // Terminal height
    assertEquals(visibleLines[0], "Line 3"); // Bottom lines are visible by default
    assertEquals(visibleLines[1], "Line 4");
    assertEquals(visibleLines[2], "Line 5");
  });

  await t.step(
    "should pad visible lines when buffer is smaller than terminal",
    () => {
      const service = new TerminalService();
      const mockSSH = new MockSSHConnectionService();
      const customSize: TerminalSize = { cols: 80, rows: 5 };
      service.createTerminalState(
        "session1",
        mockSSH,
        new MockTTYService(),
        customSize,
      );

      service.appendOutput("session1", "Line 1\nLine 2");

      const visibleLines = service.getVisibleLines("session1");
      assertEquals(visibleLines.length, 5);
      assertEquals(visibleLines[0], "Line 1");
      assertEquals(visibleLines[1], "Line 2");
      assertEquals(visibleLines[2], ""); // Padded empty lines
      assertEquals(visibleLines[3], "");
      assertEquals(visibleLines[4], "");
    },
  );

  await t.step("should clear buffer", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH, new MockTTYService());

    service.appendOutput("session1", "Line 1\nLine 2\nLine 3");
    service.clearBuffer("session1");

    const state = service.getTerminalState("session1");
    assertEquals(state?.outputBuffer.length, 0);
    assertEquals(state?.scrollPosition, 0);
  });

  await t.step("should remove terminal state", () => {
    const service = new TerminalService();
    const mockSSH = new MockSSHConnectionService();
    service.createTerminalState("session1", mockSSH, new MockTTYService());

    let state = service.getTerminalState("session1");
    assertEquals(state?.sessionId, "session1");

    service.removeTerminalState("session1");

    state = service.getTerminalState("session1");
    assertEquals(state, undefined);
  });

  await t.step("should calculate terminal size correctly", () => {
    const service = new TerminalService();

    const size = service.calculateTerminalSize(100, 50);
    assertEquals(size.cols, 100);
    assertEquals(size.rows, 50);

    // Test minimum size enforcement
    const minSize = service.calculateTerminalSize(0, 0);
    assertEquals(minSize.cols, 1);
    assertEquals(minSize.rows, 1);
  });
});
