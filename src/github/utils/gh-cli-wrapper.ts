import type { Codespace, CreateCodespaceOptions } from '../models/codespace-model.ts';

export interface GhCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

export class GitHubCliError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly code: number,
    public readonly stderr?: string
  ) {
    super(message);
    this.name = 'GitHubCliError';
  }
}

export interface IGhCliWrapper {
  listCodespaces(repository?: string): Promise<Codespace[]>;
  createCodespace(options: CreateCodespaceOptions): Promise<Codespace>;
  deleteCodespace(name: string, force?: boolean): Promise<void>;
  getCodespaceStatus(name: string): Promise<Codespace>;
  checkAuthentication(): Promise<boolean>;
}

export class GhCliWrapper implements IGhCliWrapper {
  constructor(private readonly timeout: number = 30000) {}

  async listCodespaces(repository?: string): Promise<Codespace[]> {
    const args = ['codespace', 'list', '--json'];
    if (repository) {
      args.push('--repo', repository);
    }

    const result = await this.executeCommand(args);
    if (!result.success) {
      throw new GitHubCliError(
        `Failed to list codespaces: ${result.stderr}`,
        args.join(' '),
        result.code,
        result.stderr
      );
    }

    return this.parseCodespaces(result.stdout);
  }

  async createCodespace(options: CreateCodespaceOptions): Promise<Codespace> {
    const args = ['codespace', 'create', '--repo', options.repository];
    
    if (options.branch) {
      args.push('--branch', options.branch);
    }
    
    if (options.machineType) {
      args.push('--machine', options.machineType);
    }

    if (options.retentionPeriod) {
      args.push('--retention-period', `${options.retentionPeriod}d`);
    }

    args.push('--json');

    const result = await this.executeCommand(args);
    if (!result.success) {
      throw new GitHubCliError(
        `Failed to create codespace: ${result.stderr}`,
        args.join(' '),
        result.code,
        result.stderr
      );
    }

    const codespaces = this.parseCodespaces(result.stdout);
    if (codespaces.length === 0) {
      throw new GitHubCliError(
        'No codespace data returned after creation',
        args.join(' '),
        0
      );
    }

    return codespaces[0];
  }

  async deleteCodespace(name: string, force = false): Promise<void> {
    const args = ['codespace', 'delete', '--codespace', name];
    
    if (force) {
      args.push('--force');
    }

    const result = await this.executeCommand(args);
    if (!result.success) {
      throw new GitHubCliError(
        `Failed to delete codespace ${name}: ${result.stderr}`,
        args.join(' '),
        result.code,
        result.stderr
      );
    }
  }

  async getCodespaceStatus(name: string): Promise<Codespace> {
    const args = ['codespace', 'view', '--codespace', name, '--json'];

    const result = await this.executeCommand(args);
    if (!result.success) {
      throw new GitHubCliError(
        `Failed to get codespace status for ${name}: ${result.stderr}`,
        args.join(' '),
        result.code,
        result.stderr
      );
    }

    const codespaces = this.parseCodespaces(result.stdout);
    if (codespaces.length === 0) {
      throw new GitHubCliError(
        `Codespace ${name} not found`,
        args.join(' '),
        404
      );
    }

    return codespaces[0];
  }

  async checkAuthentication(): Promise<boolean> {
    try {
      const result = await this.executeCommand(['auth', 'status']);
      return result.success;
    } catch {
      return false;
    }
  }

  private async executeCommand(args: string[]): Promise<GhCommandResult> {
    const command = new Deno.Command('gh', {
      args,
      stdout: 'piped',
      stderr: 'piped',
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GitHubCliError(
          `Command timed out after ${this.timeout}ms`,
          args.join(' '),
          -1
        );
      }
      throw new GitHubCliError(
        `Failed to execute gh command: ${error instanceof Error ? error.message : String(error)}`,
        args.join(' '),
        -1
      );
    }
  }

  private parseCodespaces(jsonOutput: string): Codespace[] {
    if (!jsonOutput.trim()) {
      return [];
    }

    try {
      const rawData = JSON.parse(jsonOutput);
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];

      return dataArray.map(item => this.mapToCodespace(item));
    } catch (error) {
      throw new GitHubCliError(
        `Failed to parse JSON output: ${error instanceof Error ? error.message : String(error)}`,
        'JSON parsing',
        -1
      );
    }
  }

  private mapToCodespace(raw: Record<string, unknown>): Codespace {
    const repository = (raw.repository as Record<string, unknown>) || {};
    const repositoryName = (repository.name as string) || '';
    const repositoryOwner = ((repository.owner as Record<string, unknown>)?.login as string) || '';

    return {
      name: (raw.name as string) || '',
      displayName: (raw.display_name as string) || (raw.name as string) || '',
      repository: repositoryName,
      owner: repositoryOwner,
      branch: ((raw.git_status as Record<string, unknown>)?.ref as string) || (raw.ref as string) || 'main',
      state: this.mapState((raw.state as string)),
      machineType: ((raw.machine as Record<string, unknown>)?.display_name as string) || (raw.machine as string) || '',
      createdAt: new Date((raw.created_at as string) || Date.now()),
      lastUsedAt: new Date((raw.last_used_at as string) || (raw.created_at as string) || Date.now()),
      url: raw.web_url as string,
      gitStatus: ((raw.git_status as Record<string, unknown>)?.ahead as number) || ((raw.git_status as Record<string, unknown>)?.behind as number) ? 
        `ahead ${((raw.git_status as Record<string, unknown>)?.ahead as number) || 0}, behind ${((raw.git_status as Record<string, unknown>)?.behind as number) || 0}` : 
        undefined,
    };
  }

  private mapState(rawState: string): Codespace['state'] {
    const stateMap: Record<string, Codespace['state']> = {
      'Available': 'Available',
      'Shutdown': 'Shutdown',
      'Starting': 'Starting',
      'Rebuilding': 'Rebuilding',
      'Unknown': 'Error',
    };

    return stateMap[rawState] || 'Error';
  }
}

export function createGhCliWrapper(timeout?: number): GhCliWrapper {
  return new GhCliWrapper(timeout);
}