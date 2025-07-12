import { Octokit } from "octokit";
import type { IGitHubAuthService } from "../service/github-auth-service.ts";

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export interface IOctokitClient {
  getOctokit(): Promise<Octokit>;
}

export class OctokitClient implements IOctokitClient {
  private static instance: OctokitClient;
  private octokit?: Octokit;

  constructor(private readonly authService: IGitHubAuthService) {}

  /**
   * Gets the singleton instance of OctokitClient
   * @param authService The authentication service to use
   * @returns The singleton OctokitClient instance
   */
  static getInstance(authService: IGitHubAuthService): OctokitClient {
    if (!OctokitClient.instance) {
      OctokitClient.instance = new OctokitClient(authService);
    }
    return OctokitClient.instance;
  }

  /**
   * Gets an authenticated Octokit instance
   * @returns Promise resolving to authenticated Octokit instance
   * @throws GitHubApiError if authentication fails
   */
  async getOctokit(): Promise<Octokit> {
    if (this.octokit) {
      return this.octokit;
    }

    try {
      const token = await this.authService.ensureAuthenticated();

      this.octokit = new Octokit({
        auth: token,
        request: {
          timeout: 30000,
        },
      });

      return this.octokit;
    } catch (error) {
      throw new GitHubApiError(
        "Failed to create authenticated Octokit client",
        undefined,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Clears the cached Octokit instance (useful for testing or auth changes)
   */
  clearCache(): void {
    this.octokit = undefined;
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  static resetInstance(): void {
    OctokitClient.instance = undefined as any;
  }
}

/**
 * Factory function to create an OctokitClient instance
 * @param authService The authentication service to use
 * @returns A new OctokitClient instance
 */
export function createOctokitClient(
  authService: IGitHubAuthService,
): IOctokitClient {
  return OctokitClient.getInstance(authService);
}
