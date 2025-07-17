import type {
  SSHSession,
  SSHSessionStatus,
} from "../models/ssh-session-model.ts";
import type { TerminalSize } from "../models/terminal-state-model.ts";
import { createSSHSession } from "../models/ssh-session-model.ts";
import { logger } from "../../logger/logger.ts";

/**
 * Error thrown when SSH operations fail.
 */
export class SSHConnectionError extends Error {
  constructor(
    message: string,
    public readonly sessionId?: string,
    public readonly exitCode?: number,
  ) {
    super(message);
    this.name = "SSHConnectionError";
  }
}

/**
 * Interface for SSH connection service operations.
 */
export interface ISSHConnectionService {
  /**
   * Connects to a GitHub Codespace via SSH.
   *
   * @param agentId - ID of the agent requesting connection
   * @param codespaceId - GitHub Codespace ID to connect to
   * @param terminalSize - Initial terminal dimensions
   * @returns Promise resolving to the SSH session
   * @throws SSHConnectionError if connection fails
   */
  connectToCodespace(
    agentId: string,
    codespaceId: string,
    terminalSize: TerminalSize,
  ): Promise<SSHSession>;

  /**
   * Sends a keystroke to the remote shell.
   *
   * @param sessionId - ID of the SSH session
   * @param keystroke - The keystroke to send
   * @throws SSHConnectionError if sending fails
   */
  sendKeystroke(sessionId: string, keystroke: string): Promise<void>;

  /**
   * Resizes the terminal for the SSH session.
   *
   * @param sessionId - ID of the SSH session
   * @param size - New terminal size
   * @throws SSHConnectionError if resize fails
   */
  resizeTerminal(sessionId: string, size: TerminalSize): Promise<void>;

  /**
   * Gets the output stream for reading from the remote shell.
   *
   * @param sessionId - ID of the SSH session
   * @returns ReadableStream of output from remote shell
   * @throws SSHConnectionError if session not found
   */
  getOutputStream(sessionId: string): ReadableStream<string>;

  /**
   * Disconnects an SSH session.
   *
   * @param sessionId - ID of the SSH session to disconnect
   * @throws SSHConnectionError if disconnect fails
   */
  disconnectSession(sessionId: string): Promise<void>;

  /**
   * Gets the current status of an SSH session.
   *
   * @param sessionId - ID of the SSH session
   * @returns Current session status
   */
  getSessionStatus(sessionId: string): SSHSessionStatus;

  /**
   * Gets all active SSH sessions.
   *
   * @returns Array of active SSH sessions
   */
  getActiveSessions(): SSHSession[];
}

/**
 * Manages SSH connections to GitHub Codespaces using gh CLI.
 */
export class SSHConnectionService implements ISSHConnectionService {
  private sessions = new Map<string, SSHSession>();
  private processes = new Map<string, Deno.ChildProcess>();
  private outputStreams = new Map<string, ReadableStream<string>>();
  private inputWriters = new Map<
    string,
    WritableStreamDefaultWriter<Uint8Array>
  >();

  constructor(private readonly connectionTimeout: number = 30000) {
  }

  async connectToCodespace(
    agentId: string,
    codespaceId: string,
    terminalSize: TerminalSize,
  ): Promise<SSHSession> {
    const session = createSSHSession(agentId, codespaceId);
    logger.info(
      `Connecting to codespace ${codespaceId} for session ${session.id}`,
    );
    this.sessions.set(session.id, session);

    try {
      // Start SSH connection using gh CLI wrapped in script command for PTY allocation
      // The script command creates a real PTY which allows SSH to allocate a pseudo-terminal
      // This eliminates "pseudo-terminal will not be allocated" warnings and enables keystroke echo
      logger.info(
        `Using script command to create PTY for SSH connection to ${codespaceId}`,
      );
      logger.info(
        `Setting SSH environment: COLUMNS=${terminalSize.cols}, LINES=${terminalSize.rows}`,
      );

      const command = new Deno.Command("script", {
        args: [
          "-qec", // -q for quiet, -e for exit on child exit, -c for command
          `stty cols ${terminalSize.cols} rows ${terminalSize.rows}; gh codespace ssh -c "${codespaceId}"`, // Set terminal size before SSH
          "/dev/null", // discard script output file
        ],
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
        env: {
          // Set terminal size via environment variables
          COLUMNS: terminalSize.cols.toString(),
          LINES: terminalSize.rows.toString(),
          TERM: "xterm-256color",
        },
      });

      const process = command.spawn();
      this.processes.set(session.id, process);

      // Create input writer for sending keystrokes
      const inputWriter = process.stdin.getWriter();
      this.inputWriters.set(session.id, inputWriter);

      // Create output stream for reading terminal output
      const outputStream = this.createOutputStream(process);
      this.outputStreams.set(session.id, outputStream);

      // Update session status to connected
      session.status = "connected" as SSHSessionStatus;
      session.lastActivity = new Date();
      this.sessions.set(session.id, session);

      // Monitor process exit
      this.monitorProcessExit(session.id, process);

      logger.info(`SSH connection established for session ${session.id}`);
      return session;
    } catch (error) {
      logger.error(`Failed to connect to codespace ${codespaceId}: ${error}`);

      // Update session status to error
      session.status = "error" as SSHSessionStatus;
      this.sessions.set(session.id, session);

      throw new SSHConnectionError(
        `Failed to connect to codespace ${codespaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        session.id,
      );
    }
  }

  async sendKeystroke(sessionId: string, keystroke: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SSHConnectionError(
        `SSH session not found: ${sessionId}`,
        sessionId,
      );
    }

    const inputWriter = this.inputWriters.get(sessionId);
    if (!inputWriter) {
      throw new SSHConnectionError(
        `No input stream for session: ${sessionId}`,
        sessionId,
      );
    }

    try {
      // Convert keystroke to bytes and send to remote shell
      const encoder = new TextEncoder();
      const keystrokeBytes = encoder.encode(keystroke);
      await inputWriter.write(keystrokeBytes);

      // Update last activity
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    } catch (error) {
      logger.error(
        `Failed to send keystroke to session ${sessionId}: ${error}`,
      );
      throw new SSHConnectionError(
        `Failed to send keystroke to session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        sessionId,
      );
    }
  }

  async resizeTerminal(sessionId: string, size: TerminalSize): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SSHConnectionError(
        `SSH session not found: ${sessionId}`,
        sessionId,
      );
    }

    logger.info(
      `SSH resizeTerminal called for session ${sessionId} with size ${size.cols}x${size.rows}`,
    );

    try {
      // Send terminal resize escape sequence as raw bytes
      const inputWriter = this.inputWriters.get(sessionId);
      if (!inputWriter) {
        throw new SSHConnectionError(
          `No input stream for session: ${sessionId}`,
          sessionId,
        );
      }

      // Create the escape sequence as bytes: ESC [ 8 ; rows ; cols t
      const escapeBytes = new Uint8Array([
        27, // ESC character
        ...new TextEncoder().encode(`[8;${size.rows};${size.cols}t`),
      ]);

      logger.info(
        `Sending resize sequence as raw bytes (rows=${size.rows}, cols=${size.cols})`,
      );

      await inputWriter.write(escapeBytes);

      // Update last activity
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);
    } catch (error) {
      logger.error(
        `Failed to resize terminal for session ${sessionId}: ${error}`,
      );
      throw new SSHConnectionError(
        `Failed to resize terminal for session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        sessionId,
      );
    }
  }

  getOutputStream(sessionId: string): ReadableStream<string> {
    const outputStream = this.outputStreams.get(sessionId);
    if (!outputStream) {
      throw new SSHConnectionError(
        `No output stream for session: ${sessionId}`,
        sessionId,
      );
    }
    return outputStream;
  }

  async disconnectSession(sessionId: string): Promise<void> {
    logger.info(`Disconnecting session ${sessionId}`);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SSHConnectionError(
        `SSH session not found: ${sessionId}`,
        sessionId,
      );
    }

    try {
      // Close input writer
      const inputWriter = this.inputWriters.get(sessionId);
      if (inputWriter) {
        await inputWriter.close();
        this.inputWriters.delete(sessionId);
      }

      // Terminate process
      const process = this.processes.get(sessionId);
      if (process) {
        process.kill("SIGTERM");
        this.processes.delete(sessionId);
      }

      // Clean up streams
      this.outputStreams.delete(sessionId);

      // Update session status
      session.status = "disconnected" as SSHSessionStatus;
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      logger.info(`Session ${sessionId} disconnected`);
    } catch (error) {
      logger.error(`Failed to disconnect session ${sessionId}: ${error}`);
      throw new SSHConnectionError(
        `Failed to disconnect session ${sessionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        sessionId,
      );
    }
  }

  getSessionStatus(sessionId: string): SSHSessionStatus {
    const session = this.sessions.get(sessionId);
    return session?.status || "error" as SSHSessionStatus;
  }

  getActiveSessions(): SSHSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) =>
        session.status === "connected" || session.status === "connecting",
    );
  }

  /**
   * Creates a readable stream from process stdout/stderr.
   *
   * @param process - The Deno child process
   * @returns ReadableStream of combined stdout/stderr output
   */
  private createOutputStream(
    process: Deno.ChildProcess,
  ): ReadableStream<string> {
    const textDecoder = new TextDecoder();

    return new ReadableStream<string>({
      async start(controller) {
        // Read from stdout
        if (process.stdout) {
          const stdoutReader = process.stdout.getReader();
          const readStdout = async () => {
            try {
              while (true) {
                const { done, value } = await stdoutReader.read();
                if (done) break;
                const rawText = textDecoder.decode(value, { stream: true });
                controller.enqueue(rawText);
              }
            } catch (error) {
              logger.error("Error reading stdout:", error);
            }
          };
          readStdout();
        }

        // Read from stderr
        if (process.stderr) {
          const stderrReader = process.stderr.getReader();
          const readStderr = async () => {
            try {
              while (true) {
                const { done, value } = await stderrReader.read();
                if (done) break;
                const rawText = textDecoder.decode(value, { stream: true });
                controller.enqueue(rawText);
              }
            } catch (error) {
              logger.error("Error reading stderr:", error);
            }
          };
          readStderr();
        }
      },
    });
  }

  /**
   * Monitors process exit and updates session status.
   *
   * @param sessionId - ID of the SSH session
   * @param process - The Deno child process to monitor
   */
  private async monitorProcessExit(
    sessionId: string,
    process: Deno.ChildProcess,
  ): Promise<void> {
    try {
      const status = await process.status;
      logger.info(
        `Process exited for session ${sessionId}, success: ${status.success}`,
      );

      const session = this.sessions.get(sessionId);

      if (session) {
        session.status = status.success
          ? "disconnected" as SSHSessionStatus
          : "error" as SSHSessionStatus;
        session.lastActivity = new Date();
        this.sessions.set(sessionId, session);
      }

      // Clean up resources
      this.processes.delete(sessionId);
      this.outputStreams.delete(sessionId);
      this.inputWriters.delete(sessionId);
    } catch (error) {
      logger.error(
        `Error monitoring process exit for session ${sessionId}:`,
        error,
      );
    }
  }
}

/**
 * Factory function to create an SSH connection service.
 *
 * @param connectionTimeout - Timeout for connection attempts in milliseconds
 * @returns New SSH connection service instance
 */
export function createSSHConnectionService(
  connectionTimeout?: number,
): ISSHConnectionService {
  const service = new SSHConnectionService(connectionTimeout);
  return service;
}
