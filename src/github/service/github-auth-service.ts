import { Octokit } from 'octokit';

export class GitHubAuthError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'GitHubAuthError';
  }
}

export interface IGitHubAuthService {
  getToken(): Promise<string>;
  validateToken(token: string): Promise<boolean>;
  isAuthenticated(): Promise<boolean>;
  ensureAuthenticated(): Promise<string>;
}

export class GitHubAuthService implements IGitHubAuthService {
  private cachedToken?: string;

  /**
   * Gets the GitHub authentication token from GitHub CLI
   * @returns The authentication token
   * @throws GitHubAuthError if token cannot be retrieved
   */
  async getToken(): Promise<string> {
    if (this.cachedToken) {
      return this.cachedToken;
    }

    try {
      const command = new Deno.Command('gh', {
        args: ['auth', 'token'],
        stdout: 'piped',
        stderr: 'piped',
      });

      const { code, stdout, stderr } = await command.output();
      
      if (code !== 0) {
        const errorMessage = new TextDecoder().decode(stderr);
        throw new GitHubAuthError(
          'Failed to get GitHub token from CLI',
          'TOKEN_RETRIEVAL_FAILED',
          errorMessage
        );
      }

      const token = new TextDecoder().decode(stdout).trim();
      if (!token) {
        throw new GitHubAuthError(
          'Empty token received from GitHub CLI',
          'EMPTY_TOKEN'
        );
      }

      this.cachedToken = token;
      return token;
    } catch (error) {
      if (error instanceof GitHubAuthError) {
        throw error;
      }
      throw new GitHubAuthError(
        'Failed to execute gh auth token command',
        'COMMAND_EXECUTION_FAILED',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validates a GitHub token using Octokit
   * @param token The token to validate
   * @returns True if token is valid, false otherwise
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const octokit = new Octokit({ auth: token });
      await octokit.rest.users.getAuthenticated();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the user is authenticated with GitHub
   * @returns True if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      return await this.validateToken(token);
    } catch {
      return false;
    }
  }

  /**
   * Ensures the user is authenticated, providing guidance if not
   * @returns The authentication token
   * @throws GitHubAuthError if user is not authenticated
   */
  async ensureAuthenticated(): Promise<string> {
    try {
      const token = await this.getToken();
      const isValid = await this.validateToken(token);
      
      if (!isValid) {
        throw new GitHubAuthError(
          'GitHub token is invalid. Please run "gh auth login" to authenticate.',
          'INVALID_TOKEN'
        );
      }

      return token;
    } catch (error) {
      if (error instanceof GitHubAuthError) {
        throw error;
      }
      
      throw new GitHubAuthError(
        'Not authenticated with GitHub. Please run "gh auth login" to authenticate.',
        'NOT_AUTHENTICATED',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Clears the cached token (useful for testing or when authentication changes)
   */
  clearCache(): void {
    this.cachedToken = undefined;
  }
}

/**
 * Factory function to create a new GitHubAuthService instance
 * @returns A new GitHubAuthService instance
 */
export function createGitHubAuthService(): IGitHubAuthService {
  return new GitHubAuthService();
}