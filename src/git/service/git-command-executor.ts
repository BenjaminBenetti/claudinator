import type {
  FileStatus,
  GitCommandResult,
  GitRemote,
} from "../models/git-status-model.ts";

export class GitCommandError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly code: number,
    public readonly stderr?: string,
  ) {
    super(message);
    this.name = "GitCommandError";
  }
}

export class NotAGitRepositoryError extends GitCommandError {
  constructor(workingDirectory: string) {
    super(
      `Not a git repository: ${workingDirectory}`,
      "git rev-parse --is-inside-work-tree",
      128,
    );
    this.name = "NotAGitRepositoryError";
  }
}

export interface IGitCommandExecutor {
  checkIsRepository(workingDirectory?: string): Promise<boolean>;
  getCurrentBranch(workingDirectory?: string): Promise<string | null>;
  getWorkingDirectoryStatus(workingDirectory?: string): Promise<FileStatus[]>;
  getRemotes(workingDirectory?: string): Promise<GitRemote[]>;
  getRepositoryRoot(workingDirectory?: string): Promise<string>;
}

export class GitCommandExecutor implements IGitCommandExecutor {
  constructor(private readonly timeout: number = 5000) {}

  async checkIsRepository(workingDirectory?: string): Promise<boolean> {
    try {
      const result = await this.executeCommand([
        "rev-parse",
        "--is-inside-work-tree",
      ], workingDirectory);
      return result.success && result.stdout.trim() === "true";
    } catch (error) {
      if (error instanceof GitCommandError && error.code === 128) {
        return false;
      }
      throw error;
    }
  }

  async getCurrentBranch(workingDirectory?: string): Promise<string | null> {
    try {
      // Try modern git first
      const result = await this.executeCommand(
        ["branch", "--show-current"],
        workingDirectory,
      );
      if (result.success) {
        const branch = result.stdout.trim();
        return branch || null; // Empty string means detached HEAD
      }

      // If first command failed, try fallback for older git versions
      const fallbackResult = await this.executeCommand([
        "rev-parse",
        "--abbrev-ref",
        "HEAD",
      ], workingDirectory);
      if (fallbackResult.success) {
        const branch = fallbackResult.stdout.trim();
        return branch === "HEAD" ? null : branch; // HEAD means detached
      }
    } catch {
      // If both fail, try fallback once more
      try {
        const result = await this.executeCommand([
          "rev-parse",
          "--abbrev-ref",
          "HEAD",
        ], workingDirectory);
        if (result.success) {
          const branch = result.stdout.trim();
          return branch === "HEAD" ? null : branch; // HEAD means detached
        }
      } catch {
        // If both fail, we're likely not in a git repo
      }
    }

    return null;
  }

  async getWorkingDirectoryStatus(
    workingDirectory?: string,
  ): Promise<FileStatus[]> {
    const result = await this.executeCommand(
      ["status", "--porcelain", "-z"],
      workingDirectory,
    );

    if (!result.success) {
      throw new GitCommandError(
        `Failed to get working directory status: ${result.stderr}`,
        "git status --porcelain -z",
        result.code,
        result.stderr,
      );
    }

    return this.parseStatusOutput(result.stdout);
  }

  async getRemotes(workingDirectory?: string): Promise<GitRemote[]> {
    const result = await this.executeCommand(
      ["remote", "-v"],
      workingDirectory,
    );

    if (!result.success) {
      throw new GitCommandError(
        `Failed to get remotes: ${result.stderr}`,
        "git remote -v",
        result.code,
        result.stderr,
      );
    }

    return this.parseRemotesOutput(result.stdout);
  }

  async getRepositoryRoot(workingDirectory?: string): Promise<string> {
    const result = await this.executeCommand(
      ["rev-parse", "--show-toplevel"],
      workingDirectory,
    );

    if (!result.success) {
      if (result.code === 128) {
        throw new NotAGitRepositoryError(workingDirectory || Deno.cwd());
      }
      throw new GitCommandError(
        `Failed to get repository root: ${result.stderr}`,
        "git rev-parse --show-toplevel",
        result.code,
        result.stderr,
      );
    }

    return result.stdout.trim();
  }

  private async executeCommand(
    args: string[],
    workingDirectory?: string,
  ): Promise<GitCommandResult> {
    const command = new Deno.Command("git", {
      args,
      stdout: "piped",
      stderr: "piped",
      cwd: workingDirectory,
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const { code, stdout, stderr } = await command.output();

      clearTimeout(timeoutId);

      const stdoutText = new TextDecoder().decode(stdout);
      const stderrText = new TextDecoder().decode(stderr);

      return {
        success: code === 0,
        stdout: stdoutText,
        stderr: stderrText,
        code,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new GitCommandError(
          `Git command timed out after ${this.timeout}ms`,
          args.join(" "),
          -1,
        );
      }
      throw new GitCommandError(
        `Failed to execute git command: ${
          error instanceof Error ? error.message : String(error)
        }`,
        args.join(" "),
        -1,
      );
    }
  }

  private parseStatusOutput(output: string): FileStatus[] {
    if (!output.trim()) {
      return [];
    }

    // Split by null character, filter empty entries
    const entries = output.split("\0").filter((entry) => entry.length > 0);
    const fileStatuses: FileStatus[] = [];

    for (const entry of entries) {
      if (entry.length < 3) continue; // Min: "XY filename"

      const statusCode = entry.substring(0, 2);
      const filePath = entry.substring(3);

      // Parse the XY status codes
      const stagedChar = statusCode[0];
      const unstagedChar = statusCode[1];

      // Handle untracked files (special case) first
      if (statusCode === "??") {
        fileStatuses.push({
          path: filePath,
          status: "untracked",
          staged: false,
        });
        continue; // Skip other processing for untracked files
      }

      // Handle staged changes
      if (stagedChar !== " ") {
        fileStatuses.push({
          path: filePath,
          status: this.mapStatusChar(stagedChar),
          staged: true,
        });
      }

      // Handle unstaged changes
      if (unstagedChar !== " ") {
        fileStatuses.push({
          path: filePath,
          status: this.mapStatusChar(unstagedChar),
          staged: false,
        });
      }
    }

    return fileStatuses;
  }

  private mapStatusChar(char: string): FileStatus["status"] {
    switch (char) {
      case "M":
        return "modified";
      case "A":
        return "added";
      case "D":
        return "deleted";
      case "R":
        return "renamed";
      case "?":
        return "untracked";
      default:
        return "modified"; // Default fallback
    }
  }

  private parseRemotesOutput(output: string): GitRemote[] {
    if (!output.trim()) {
      return [];
    }

    const lines = output.trim().split("\n");
    const remoteMap = new Map<
      string,
      { fetchUrl?: string; pushUrl?: string }
    >();

    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
      if (!match) continue;

      const [, name, url, type] = match;

      if (!remoteMap.has(name)) {
        remoteMap.set(name, {});
      }

      const remote = remoteMap.get(name)!;
      if (type === "fetch") {
        remote.fetchUrl = url;
      } else if (type === "push") {
        remote.pushUrl = url;
      }
    }

    return Array.from(remoteMap.entries()).map(([name, urls]) => ({
      name,
      fetchUrl: urls.fetchUrl || "",
      pushUrl: urls.pushUrl || urls.fetchUrl || "",
    }));
  }
}

export function createGitCommandExecutor(timeout?: number): GitCommandExecutor {
  return new GitCommandExecutor(timeout);
}
