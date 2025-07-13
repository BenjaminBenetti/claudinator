import { assertEquals, assertRejects } from "@std/assert";
import {
  SSHConnectionError,
  SSHConnectionService,
} from "./ssh-connection-service.ts";
import type { TerminalSize } from "../models/terminal-state-model.ts";
import { SSHSessionStatus } from "../models/ssh-session-model.ts";

// Mock Deno.Command for testing
class MockChildProcess {
  stdin: WritableStream<Uint8Array>;
  stdout: ReadableStream<Uint8Array> | null;
  stderr: ReadableStream<Uint8Array> | null;
  status: Promise<Deno.CommandStatus>;

  constructor() {
    this.stdin = new WritableStream();
    this.stdout = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("test output\n"));
        controller.close();
      },
    });
    this.stderr = new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
    this.status = Promise.resolve({ success: true, code: 0, signal: null });
  }

  kill(_signal?: string) {
    // Mock kill method
  }
}

class MockCommand {
  args: string[];
  options: Deno.CommandOptions;

  constructor(_command: string, options: Deno.CommandOptions) {
    this.args = options.args || [];
    this.options = options;
  }

  spawn(): MockChildProcess {
    return new MockChildProcess();
  }
}

// Override global Deno.Command for tests
const originalCommand = (globalThis as any).Deno.Command;

Deno.test("SSHConnectionService", async (t) => {
  await t.step("should create SSH connection service", () => {
    const service = new SSHConnectionService();
    assertEquals(typeof service.connectToCodespace, "function");
    assertEquals(typeof service.sendKeystroke, "function");
    assertEquals(typeof service.disconnectSession, "function");
  });

  await t.step("should connect to codespace successfully", async () => {
    // Mock Deno.Command
    (globalThis as any).Deno.Command = MockCommand;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      const session = await service.connectToCodespace(
        "agent1",
        "codespace1",
        terminalSize,
      );

      assertEquals(session.agentId, "agent1");
      assertEquals(session.codespaceId, "codespace1");
      assertEquals(session.status, SSHSessionStatus.Connected);
    } finally {
      // Restore original command
      (globalThis as any).Deno.Command = originalCommand;
    }
  });

  await t.step("should use script command for PTY allocation", async () => {
    // Mock Deno.Command to capture command and arguments
    let capturedCommand: string = "";
    let capturedArgs: string[] = [];
    class CommandCapture extends MockCommand {
      constructor(command: string, options: Deno.CommandOptions) {
        super(command, options);
        capturedCommand = command;
        capturedArgs = options.args || [];
      }
    }

    (globalThis as any).Deno.Command = CommandCapture;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      await service.connectToCodespace("agent1", "codespace1", terminalSize);

      // Verify that the command uses script for PTY allocation
      assertEquals(capturedCommand, "script");
      assertEquals(capturedArgs, ["-qec", 'gh codespace ssh -c "codespace1"', "/dev/null"]);
    } finally {
      // Restore original command
      (globalThis as any).Deno.Command = originalCommand;
    }
  });

  await t.step("should handle connection failure", async () => {
    // Mock failed command
    class FailingCommand extends MockCommand {
      override spawn(): MockChildProcess {
        throw new Error("Connection failed");
      }
    }

    (globalThis as any).Deno.Command = FailingCommand;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      await assertRejects(
        () => service.connectToCodespace("agent1", "codespace1", terminalSize),
        SSHConnectionError,
        "Failed to connect to codespace",
      );
    } finally {
      (globalThis as any).Deno.Command = originalCommand;
    }
  });

  await t.step("should send keystrokes to active session", async () => {
    (globalThis as any).Deno.Command = MockCommand;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      const session = await service.connectToCodespace(
        "agent1",
        "codespace1",
        terminalSize,
      );

      // Should not throw
      await service.sendKeystroke(session.id, "ls\n");
    } finally {
      (globalThis as any).Deno.Command = originalCommand;
    }
  });

  await t.step(
    "should reject keystrokes for non-existent session",
    async () => {
      const service = new SSHConnectionService();

      await assertRejects(
        () => service.sendKeystroke("invalid-session", "ls\n"),
        SSHConnectionError,
        "SSH session not found",
      );
    },
  );

  await t.step("should get session status", async () => {
    (globalThis as any).Deno.Command = MockCommand;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      const session = await service.connectToCodespace(
        "agent1",
        "codespace1",
        terminalSize,
      );
      const status = service.getSessionStatus(session.id);

      assertEquals(status, SSHSessionStatus.Connected);
    } finally {
      (globalThis as any).Deno.Command = originalCommand;
    }
  });

  await t.step("should return error status for non-existent session", () => {
    const service = new SSHConnectionService();
    const status = service.getSessionStatus("invalid-session");

    assertEquals(status, SSHSessionStatus.Error);
  });

  await t.step("should disconnect session successfully", async () => {
    (globalThis as any).Deno.Command = MockCommand;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      const session = await service.connectToCodespace(
        "agent1",
        "codespace1",
        terminalSize,
      );

      // Should not throw
      await service.disconnectSession(session.id);

      const status = service.getSessionStatus(session.id);
      assertEquals(status, SSHSessionStatus.Disconnected);
    } finally {
      (globalThis as any).Deno.Command = originalCommand;
    }
  });

  await t.step("should get active sessions", async () => {
    (globalThis as any).Deno.Command = MockCommand;

    const service = new SSHConnectionService();
    const terminalSize: TerminalSize = { cols: 80, rows: 24 };

    try {
      await service.connectToCodespace("agent1", "codespace1", terminalSize);
      await service.connectToCodespace("agent2", "codespace2", terminalSize);

      const activeSessions = service.getActiveSessions();
      assertEquals(activeSessions.length, 2);
    } finally {
      (globalThis as any).Deno.Command = originalCommand;
    }
  });
});
