/**
 * SSH session domain models for managing connections to GitHub Codespaces.
 */

/**
 * Represents an active SSH session to a GitHub Codespace.
 */
export interface SSHSession {
  /** Unique identifier for the SSH session */
  id: string;
  /** ID of the agent this session belongs to */
  agentId: string;
  /** GitHub Codespace ID being connected to */
  codespaceId: string;
  /** Current status of the SSH connection */
  status: SSHSessionStatus;
  /** When the session was created */
  createdAt: Date;
  /** Last time there was activity on this session */
  lastActivity: Date;
  /** Current working directory in the remote shell */
  workingDirectory: string;
  /** Process ID of the SSH connection (if available) */
  processId?: number;
}

/**
 * Status enumeration for SSH sessions.
 */
export enum SSHSessionStatus {
  Connecting = "connecting",
  Connected = "connected",
  Disconnected = "disconnected",
  Error = "error",
}

/**
 * Factory function to create a new SSH session.
 *
 * @param agentId - ID of the agent this session belongs to
 * @param codespaceId - GitHub Codespace ID to connect to
 * @returns A new SSH session in connecting state
 */
export function createSSHSession(
  agentId: string,
  codespaceId: string,
): SSHSession {
  return {
    id: crypto.randomUUID(),
    agentId,
    codespaceId,
    status: SSHSessionStatus.Connecting,
    createdAt: new Date(),
    lastActivity: new Date(),
    workingDirectory: "/workspaces",
    processId: undefined,
  };
}
