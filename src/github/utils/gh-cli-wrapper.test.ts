import { assertEquals, assertRejects, assertInstanceOf } from '@std/assert';
import { GhCliWrapper, GitHubCliError, createGhCliWrapper } from './gh-cli-wrapper.ts';

// Mock for Deno.Command
class MockCommand {
  constructor(
    private program: string,
    private options: { args: string[]; stdout: string; stderr: string }
  ) {}

  static mockResponses: Map<string, { code: number; stdout: string; stderr: string }> = new Map();

  static setMockResponse(args: string[], response: { code: number; stdout: string; stderr: string }) {
    this.mockResponses.set(args.join(' '), response);
  }

  static clearMocks() {
    this.mockResponses.clear();
  }

  async output(): Promise<{ code: number; stdout: Uint8Array; stderr: Uint8Array }> {
    const key = this.options.args.join(' ');
    const response = MockCommand.mockResponses.get(key) || { code: 0, stdout: '[]', stderr: '' };
    
    return {
      code: response.code,
      stdout: new TextEncoder().encode(response.stdout),
      stderr: new TextEncoder().encode(response.stderr),
    };
  }
}

// Replace Deno.Command with our mock
const originalCommand = Deno.Command;
// @ts-ignore: Mocking global Deno.Command for testing
Deno.Command = MockCommand as any;

Deno.test({
  name: 'GhCliWrapper factory function',
  fn() {
    const wrapper = createGhCliWrapper();
    assertInstanceOf(wrapper, GhCliWrapper);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'listCodespaces with empty response',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['codespace', 'list', '--json'], {
      code: 0,
      stdout: '[]',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    const codespaces = await wrapper.listCodespaces();
    
    assertEquals(codespaces.length, 0);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'listCodespaces with valid response',
  async fn() {
    MockCommand.clearMocks();
    const mockData = [{
      name: 'test-codespace-123',
      display_name: 'Test Codespace',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-owner' }
      },
      git_status: { ref: 'main' },
      state: 'Available',
      machine: { display_name: '2core' },
      created_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-02T00:00:00Z',
      web_url: 'https://github.dev/test-owner/test-repo'
    }];

    MockCommand.setMockResponse(['codespace', 'list', '--json'], {
      code: 0,
      stdout: JSON.stringify(mockData),
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    const codespaces = await wrapper.listCodespaces();
    
    assertEquals(codespaces.length, 1);
    assertEquals(codespaces[0].name, 'test-codespace-123');
    assertEquals(codespaces[0].repository, 'test-repo');
    assertEquals(codespaces[0].owner, 'test-owner');
    assertEquals(codespaces[0].state, 'Available');
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'listCodespaces with repository filter',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['codespace', 'list', '--json', '--repo', 'owner/repo'], {
      code: 0,
      stdout: '[]',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    const codespaces = await wrapper.listCodespaces('owner/repo');
    
    assertEquals(codespaces.length, 0);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'createCodespace with minimal options',
  async fn() {
    MockCommand.clearMocks();
    const mockData = [{
      name: 'new-codespace-123',
      display_name: 'New Codespace',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-owner' }
      },
      git_status: { ref: 'main' },
      state: 'Starting',
      machine: { display_name: '2core' },
      created_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-01T00:00:00Z'
    }];

    // Mock the create command (without --json flag)
    MockCommand.setMockResponse(['codespace', 'create', '--repo', 'owner/repo'], {
      code: 0,
      stdout: '✓ Codespaces usage for this repository is paid for by test-owner\nnew-codespace-123',
      stderr: '',
    });

    // Mock the view command to get full details
    MockCommand.setMockResponse(['codespace', 'view', '--codespace', 'new-codespace-123', '--json'], {
      code: 0,
      stdout: JSON.stringify(mockData[0]),
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    const codespace = await wrapper.createCodespace({ repository: 'owner/repo' });
    
    assertEquals(codespace.name, 'new-codespace-123');
    assertEquals(codespace.state, 'Starting');
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'createCodespace with full options',
  async fn() {
    MockCommand.clearMocks();
    const mockData = [{
      name: 'feature-codespace-123',
      display_name: 'Feature Codespace',
      repository: {
        name: 'test-repo',
        owner: { login: 'test-owner' }
      },
      git_status: { ref: 'feature-branch' },
      state: 'Starting',
      machine: { display_name: '4core' },
      created_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-01T00:00:00Z'
    }];

    // Mock the create command (without --json flag)
    MockCommand.setMockResponse([
      'codespace', 'create', '--repo', 'owner/repo',
      '--branch', 'feature-branch', '--machine', 'basicLinux32gb',
      '--retention-period', '30d'
    ], {
      code: 0,
      stdout: '✓ Codespaces usage for this repository is paid for by test-owner\nfeature-codespace-123',
      stderr: '',
    });

    // Mock the view command to get full details
    MockCommand.setMockResponse(['codespace', 'view', '--codespace', 'feature-codespace-123', '--json'], {
      code: 0,
      stdout: JSON.stringify(mockData[0]),
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    const codespace = await wrapper.createCodespace({
      repository: 'owner/repo',
      branch: 'feature-branch',
      machineType: 'basicLinux32gb',
      retentionPeriod: 30
    });

    assertEquals(codespace.name, 'feature-codespace-123');
    assertEquals(codespace.branch, 'feature-branch');
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'deleteCodespace success',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['codespace', 'delete', '--codespace', 'test-123'], {
      code: 0,
      stdout: '',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    await wrapper.deleteCodespace('test-123');
    // Should complete without throwing
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'deleteCodespace with force',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['codespace', 'delete', '--codespace', 'test-123', '--force'], {
      code: 0,
      stdout: '',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    await wrapper.deleteCodespace('test-123', true);
    // Should complete without throwing
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'checkAuthentication success',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['auth', 'status'], {
      code: 0,
      stdout: 'Logged in to github.com',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    const isAuthenticated = await wrapper.checkAuthentication();
    
    assertEquals(isAuthenticated, true);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'checkAuthentication failure',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['auth', 'status'], {
      code: 1,
      stdout: '',
      stderr: 'Not authenticated',
    });

    const wrapper = new GhCliWrapper();
    const isAuthenticated = await wrapper.checkAuthentication();
    
    assertEquals(isAuthenticated, false);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'error handling for failed commands',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['codespace', 'list', '--json'], {
      code: 1,
      stdout: '',
      stderr: 'Authentication failed',
    });

    const wrapper = new GhCliWrapper();
    
    await assertRejects(
      () => wrapper.listCodespaces(),
      GitHubCliError,
      'Failed to list codespaces: Authentication failed'
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'error handling for invalid JSON',
  async fn() {
    MockCommand.clearMocks();
    MockCommand.setMockResponse(['codespace', 'list', '--json'], {
      code: 0,
      stdout: 'invalid json',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();
    
    await assertRejects(
      () => wrapper.listCodespaces(),
      GitHubCliError,
      'Failed to parse JSON output'
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'createCodespace handles parsing errors gracefully',
  async fn() {
    MockCommand.clearMocks();

    // Mock create command with invalid output (no codespace name)
    MockCommand.setMockResponse(['codespace', 'create', '--repo', 'owner/repo'], {
      code: 0,
      stdout: '✓ Codespaces usage for this repository is paid for by test-owner\n',
      stderr: '',
    });

    const wrapper = new GhCliWrapper();

    await assertRejects(
      () => wrapper.createCodespace({ repository: 'owner/repo' }),
      GitHubCliError,
      'Could not extract codespace name from create output'
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'createCodespace handles create command failure',
  async fn() {
    MockCommand.clearMocks();

    // Mock create command failure
    MockCommand.setMockResponse(['codespace', 'create', '--repo', 'owner/repo'], {
      code: 1,
      stdout: '',
      stderr: 'Repository not found',
    });

    const wrapper = new GhCliWrapper();

    await assertRejects(
      () => wrapper.createCodespace({ repository: 'owner/repo' }),
      GitHubCliError,
      'Failed to create codespace: Repository not found'
    );
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// Restore original Deno.Command after all tests
Deno.test({
  name: 'cleanup - restore Deno.Command',
  fn() {
    // @ts-ignore: Restoring global Deno.Command after testing
    Deno.Command = originalCommand;
  },
  sanitizeOps: false,
  sanitizeResources: false,
});