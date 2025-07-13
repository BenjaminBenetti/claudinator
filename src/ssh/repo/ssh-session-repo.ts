import type { SSHSession } from "../models/ssh-session-model.ts";

/**
 * Error thrown when SSH session repository operations fail.
 */
export class SSHSessionRepoError extends Error {
  constructor(message: string, public readonly sessionId?: string) {
    super(message);
    this.name = "SSHSessionRepoError";
  }
}

/**
 * Interface for SSH session repository operations.
 */
export interface ISSHSessionRepo {
  /**
   * Saves an SSH session.
   *
   * @param session - The SSH session to save
   * @throws SSHSessionRepoError if save fails
   */
  save(session: SSHSession): Promise<void>;

  /**
   * Finds an SSH session by ID.
   *
   * @param id - ID of the SSH session
   * @returns SSH session or undefined if not found
   * @throws SSHSessionRepoError if find fails
   */
  findById(id: string): Promise<SSHSession | undefined>;

  /**
   * Finds SSH sessions by agent ID.
   *
   * @param agentId - ID of the agent
   * @returns Array of SSH sessions for the agent
   * @throws SSHSessionRepoError if find fails
   */
  findByAgentId(agentId: string): Promise<SSHSession[]>;

  /**
   * Finds SSH sessions by codespace ID.
   *
   * @param codespaceId - ID of the codespace
   * @returns Array of SSH sessions for the codespace
   * @throws SSHSessionRepoError if find fails
   */
  findByCodespaceId(codespaceId: string): Promise<SSHSession[]>;

  /**
   * Gets all SSH sessions.
   *
   * @returns Array of all SSH sessions
   * @throws SSHSessionRepoError if find fails
   */
  findAll(): Promise<SSHSession[]>;

  /**
   * Updates an existing SSH session.
   *
   * @param session - The SSH session to update
   * @throws SSHSessionRepoError if update fails or session not found
   */
  update(session: SSHSession): Promise<void>;

  /**
   * Deletes an SSH session by ID.
   *
   * @param id - ID of the SSH session to delete
   * @throws SSHSessionRepoError if delete fails
   */
  deleteById(id: string): Promise<void>;

  /**
   * Deletes all SSH sessions for an agent.
   *
   * @param agentId - ID of the agent
   * @throws SSHSessionRepoError if delete fails
   */
  deleteByAgentId(agentId: string): Promise<void>;
}

/**
 * In-memory implementation of SSH session repository.
 * Note: This is a simple in-memory implementation. In a production system,
 * you might want to persist sessions to disk or database.
 */
export class SSHSessionRepo implements ISSHSessionRepo {
  private sessions = new Map<string, SSHSession>();

  async save(session: SSHSession): Promise<void> {
    try {
      this.sessions.set(session.id, { ...session });
    } catch (error) {
      throw new SSHSessionRepoError(
        `Failed to save SSH session ${session.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        session.id,
      );
    }
  }

  async findById(id: string): Promise<SSHSession | undefined> {
    try {
      const session = this.sessions.get(id);
      return session ? { ...session } : undefined;
    } catch (error) {
      throw new SSHSessionRepoError(
        `Failed to find SSH session ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        id,
      );
    }
  }

  async findByAgentId(agentId: string): Promise<SSHSession[]> {
    try {
      const sessions: SSHSession[] = [];
      for (const session of this.sessions.values()) {
        if (session.agentId === agentId) {
          sessions.push({ ...session });
        }
      }
      return sessions;
    } catch (error) {
      throw new SSHSessionRepoError(
        `Failed to find SSH sessions for agent ${agentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findByCodespaceId(codespaceId: string): Promise<SSHSession[]> {
    try {
      const sessions: SSHSession[] = [];
      for (const session of this.sessions.values()) {
        if (session.codespaceId === codespaceId) {
          sessions.push({ ...session });
        }
      }
      return sessions;
    } catch (error) {
      throw new SSHSessionRepoError(
        `Failed to find SSH sessions for codespace ${codespaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findAll(): Promise<SSHSession[]> {
    try {
      return Array.from(this.sessions.values()).map((session) => ({
        ...session,
      }));
    } catch (error) {
      throw new SSHSessionRepoError(
        `Failed to find all SSH sessions: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async update(session: SSHSession): Promise<void> {
    try {
      if (!this.sessions.has(session.id)) {
        throw new SSHSessionRepoError(
          `SSH session not found: ${session.id}`,
          session.id,
        );
      }
      this.sessions.set(session.id, { ...session });
    } catch (error) {
      if (error instanceof SSHSessionRepoError) {
        throw error;
      }
      throw new SSHSessionRepoError(
        `Failed to update SSH session ${session.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        session.id,
      );
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      if (!this.sessions.has(id)) {
        throw new SSHSessionRepoError(`SSH session not found: ${id}`, id);
      }
      this.sessions.delete(id);
    } catch (error) {
      if (error instanceof SSHSessionRepoError) {
        throw error;
      }
      throw new SSHSessionRepoError(
        `Failed to delete SSH session ${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        id,
      );
    }
  }

  async deleteByAgentId(agentId: string): Promise<void> {
    try {
      const sessionsToDelete: string[] = [];
      for (const [id, session] of this.sessions.entries()) {
        if (session.agentId === agentId) {
          sessionsToDelete.push(id);
        }
      }

      for (const id of sessionsToDelete) {
        this.sessions.delete(id);
      }
    } catch (error) {
      throw new SSHSessionRepoError(
        `Failed to delete SSH sessions for agent ${agentId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

/**
 * Factory function to create an SSH session repository.
 *
 * @returns New SSH session repository instance
 */
export function createSSHSessionRepo(): ISSHSessionRepo {
  return new SSHSessionRepo();
}
