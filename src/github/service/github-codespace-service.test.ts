import { assertEquals, assertRejects, assertInstanceOf } from '@std/assert';
import { 
  GitHubCodespaceServiceImpl, 
  GitHubCodespaceServiceError,
  createGitHubCodespaceService 
} from './github-codespace-service.ts';
import type { GitHubCodespaceRepository } from '../repo/github-codespace-repo.ts';
import type { IGitHubAuthService } from './github-auth-service.ts';
import type { Codespace, CreateCodespaceOptions } from '../models/codespace-model.ts';
import { createMinimalRepository, createSimpleUser } from '../utils/test-helpers.ts';

// Mock implementations
class MockGitHubCodespaceRepository implements GitHubCodespaceRepository {
  public findAllCalls: string[] = [];
  public findByNameCalls: string[] = [];
  public createCalls: Array<{ owner: string; repo: string; options: CreateCodespaceOptions }> = [];
  public deleteCalls: string[] = [];
  public deleteAllCalls: { repository?: string; olderThanDays?: number }[] = [];
  public startCalls: string[] = [];
  public stopCalls: string[] = [];

  private mockCodespaces: Codespace[] = [];
  private shouldThrowOnCreate = false;
  private shouldThrowOnDelete = false;
  private shouldThrowOnFind = false;
  private shouldThrowOnStart = false;
  private shouldThrowOnStop = false;
  private codespaceStateMap = new Map<string, string>();

  setMockCodespaces(codespaces: Codespace[]) {
    this.mockCodespaces = codespaces;
  }

  setShouldThrowOnCreate(shouldThrow: boolean) {
    this.shouldThrowOnCreate = shouldThrow;
  }

  setShouldThrowOnDelete(shouldThrow: boolean) {
    this.shouldThrowOnDelete = shouldThrow;
  }

  setShouldThrowOnFind(shouldThrow: boolean) {
    this.shouldThrowOnFind = shouldThrow;
  }

  setShouldThrowOnStart(shouldThrow: boolean) {
    this.shouldThrowOnStart = shouldThrow;
  }

  setShouldThrowOnStop(shouldThrow: boolean) {
    this.shouldThrowOnStop = shouldThrow;
  }

  async findAll(repository?: string): Promise<Codespace[]> {
    this.findAllCalls.push(repository || 'all');
    if (this.shouldThrowOnFind) {
      throw new Error('Mock find error');
    }
    return await Promise.resolve([...this.mockCodespaces]);
  }

  async findByName(name: string): Promise<Codespace | null> {
    this.findByNameCalls.push(name);
    if (this.shouldThrowOnFind) {
      throw new Error('Mock find error');
    }
    let found = this.mockCodespaces.find(cs => cs.name === name);
    if (found && this.codespaceStateMap.has(name)) {
      found = { ...found, state: this.codespaceStateMap.get(name) as any };
    }
    return await Promise.resolve(found || null);
  }

  async create(owner: string, repo: string, options: CreateCodespaceOptions): Promise<Codespace> {
    this.createCalls.push({ owner, repo, options });
    if (this.shouldThrowOnCreate) {
      throw new Error('Mock create error');
    }

    const newCodespace: Codespace = {
      id: 123456789,
      name: 'mock-codespace-123',
      environment_id: 'env-123',
      owner: { 
        login: owner, 
        id: 1, 
        node_id: 'node1', 
        avatar_url: '', 
        gravatar_id: null,
        url: '', 
        html_url: '', 
        followers_url: '',
        following_url: '',
        gists_url: '',
        starred_url: '',
        subscriptions_url: '',
        organizations_url: '',
        repos_url: '',
        events_url: '',
        received_events_url: '',
        type: 'User', 
        site_admin: false 
      },
      billable_owner: { 
        login: owner, 
        id: 1, 
        node_id: 'node1', 
        avatar_url: '', 
        gravatar_id: null,
        url: '', 
        html_url: '', 
        followers_url: '',
        following_url: '',
        gists_url: '',
        starred_url: '',
        subscriptions_url: '',
        organizations_url: '',
        repos_url: '',
        events_url: '',
        received_events_url: '',
        type: 'User', 
        site_admin: false 
      },
      repository: createMinimalRepository({
        id: 67890,
        node_id: 'repo-node',
        name: repo,
        full_name: `${owner}/${repo}`,
        owner: createSimpleUser({ 
          login: owner, 
          id: 1, 
          node_id: 'node1'
        }),
        private: false,
        html_url: `https://github.com/${owner}/${repo}`,
        description: null
      }),
      machine: {
        name: options.machine || 'basicLinux32gb',
        display_name: 'Basic',
        operating_system: 'linux' as const,
        storage_in_bytes: 32000000000,
        memory_in_bytes: 8000000000,
        cpus: 2,
        prebuild_availability: null
      },
      devcontainer_path: '.devcontainer/devcontainer.json',
      prebuild: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      last_used_at: '2024-01-01T00:00:00Z',
      state: 'Starting',
      url: 'https://api.github.com/user/codespaces/mock-codespace-123',
      git_status: {
        ahead: 0,
        behind: 0,
        has_unpushed_changes: false,
        has_uncommitted_changes: false,
        ref: options.ref || 'main'
      },
      location: 'EastUs',
      idle_timeout_minutes: 30,
      web_url: 'https://mock-codespace-123.github.dev',
      machines_url: 'https://api.github.com/user/codespaces/mock-codespace-123/machines',
      start_url: 'https://api.github.com/user/codespaces/mock-codespace-123/start',
      stop_url: 'https://api.github.com/user/codespaces/mock-codespace-123/stop',
      recent_folders: [],
      pulls_url: 'https://api.github.com/user/codespaces/mock-codespace-123/pulls'
    };

    // Add the codespace to our collection and simulate state transition
    this.mockCodespaces.push(newCodespace);
    
    // Simulate transition from Starting to Available after a brief delay
    setTimeout(() => {
      this.codespaceStateMap.set(newCodespace.name, 'Available');
    }, 10);

    return await Promise.resolve(newCodespace);
  }

  async delete(name: string): Promise<void> {
    this.deleteCalls.push(name);
    if (this.shouldThrowOnDelete) {
      throw new Error('Mock delete error');
    }
    return await Promise.resolve();
  }

  async deleteAll(repository?: string, olderThanDays?: number): Promise<void> {
    this.deleteAllCalls.push({ repository, olderThanDays });
    return await Promise.resolve();
  }

  async startCodespace(name: string): Promise<Codespace> {
    this.startCalls.push(name);
    if (this.shouldThrowOnStart) {
      throw new Error('Mock start error');
    }
    const found = this.mockCodespaces.find(cs => cs.name === name);
    if (!found) throw new Error('Codespace not found');
    return { ...found, state: 'Available' };
  }

  async stopCodespace(name: string): Promise<Codespace> {
    this.stopCalls.push(name);
    if (this.shouldThrowOnStop) {
      throw new Error('Mock stop error');
    }
    const found = this.mockCodespaces.find(cs => cs.name === name);
    if (!found) throw new Error('Codespace not found');
    return { ...found, state: 'Shutdown' };
  }
}

class MockGitHubAuthService implements IGitHubAuthService {
  private shouldThrowOnAuth = false;
  private mockToken = 'mock-token';

  setShouldThrowOnAuth(shouldThrow: boolean) {
    this.shouldThrowOnAuth = shouldThrow;
  }

  async getToken(): Promise<string> {
    if (this.shouldThrowOnAuth) {
      throw new Error('Mock auth error');
    }
    return this.mockToken;
  }

  async validateToken(token: string): Promise<boolean> {
    return !this.shouldThrowOnAuth && token === this.mockToken;
  }

  async isAuthenticated(): Promise<boolean> {
    return !this.shouldThrowOnAuth;
  }

  async ensureAuthenticated(): Promise<string> {
    if (this.shouldThrowOnAuth) {
      throw new Error('Not authenticated');
    }
    return this.mockToken;
  }

  clearCache(): void {
    // Mock implementation
  }
}

function createMockCodespace(overrides: Partial<Codespace> = {}): Codespace {
  return {
    id: 123456789,
    name: 'test-codespace-123',
    environment_id: 'env-123',
    owner: { login: 'test-owner', id: 1, node_id: 'node1', avatar_url: '', url: '', html_url: '', type: 'User', site_admin: false },
    billable_owner: { login: 'test-owner', id: 1, node_id: 'node1', avatar_url: '', url: '', html_url: '', type: 'User', site_admin: false },
    repository: {
      id: 67890,
      node_id: 'repo-node',
      name: 'test-repo',
      full_name: 'test-owner/test-repo',
      owner: { login: 'test-owner', id: 1, node_id: 'node1', avatar_url: '', url: '', html_url: '', type: 'User', site_admin: false },
      private: false,
      html_url: 'https://github.com/test-owner/test-repo',
      description: null
    },
    machine: {
      name: 'basicLinux32gb',
      display_name: 'Basic',
      operating_system: 'linux' as const,
      storage_in_bytes: 32000000000,
      memory_in_bytes: 8000000000,
      cpus: 2,
      prebuild_availability: null
    },
    devcontainer_path: '.devcontainer/devcontainer.json',
    prebuild: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    last_used_at: '2024-01-02T00:00:00Z',
    state: 'Available',
    url: 'https://api.github.com/user/codespaces/test-codespace-123',
    git_status: {
      ahead: 0,
      behind: 0,
      has_unpushed_changes: false,
      has_uncommitted_changes: false,
      ref: 'main'
    },
    location: 'UsEast',
    idle_timeout_minutes: 30,
    web_url: 'https://test-codespace-123.github.dev',
    machines_url: 'https://api.github.com/user/codespaces/test-codespace-123/machines',
    start_url: 'https://api.github.com/user/codespaces/test-codespace-123/start',
    stop_url: 'https://api.github.com/user/codespaces/test-codespace-123/stop',
    recent_folders: [],
    ...overrides,
  } as Codespace;
}

Deno.test('GitHubCodespaceService factory function', () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const service = createGitHubCodespaceService(mockRepository, mockAuthService);
  assertInstanceOf(service, GitHubCodespaceServiceImpl);
});

Deno.test('listCodespaces success', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespaces = [
    createMockCodespace({ name: 'codespace-1' }),
    createMockCodespace({ name: 'codespace-2' }),
  ];
  mockRepository.setMockCodespaces(mockCodespaces);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  const result = await service.listCodespaces();

  assertEquals(result.length, 2);
  assertEquals(result[0].name, 'codespace-1');
  assertEquals(result[1].name, 'codespace-2');
  assertEquals(mockRepository.findAllCalls, ['all']);
});

Deno.test('listCodespaces with repository filter', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespaces = [createMockCodespace()];
  mockRepository.setMockCodespaces(mockCodespaces);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  await service.listCodespaces('owner/repo');

  assertEquals(mockRepository.findAllCalls, ['owner/repo']);
});

Deno.test('listCodespaces authentication failure', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  mockAuthService.setShouldThrowOnAuth(true);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.listCodespaces(),
    GitHubCodespaceServiceError,
    'Failed to list codespaces'
  );
});

Deno.test('listCodespaces repository format validation', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.listCodespaces('invalid-format'),
    GitHubCodespaceServiceError,
    'Repository must be in format "owner/repo"'
  );
});

Deno.test('createCodespace success', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  const result = await service.createCodespace('owner/repo', 'feature-branch');

  assertEquals(result.name, 'mock-codespace-123');
  assertEquals(result.git_status.ref, 'feature-branch');
  assertEquals(mockRepository.createCalls.length, 1);
  assertEquals(mockRepository.createCalls[0].owner, 'owner');
  assertEquals(mockRepository.createCalls[0].repo, 'repo');
  assertEquals(mockRepository.createCalls[0].options.ref, 'feature-branch');
});

Deno.test('createCodespace validation - invalid repository format', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.createCodespace('invalid-format'),
    GitHubCodespaceServiceError,
    'Repository must be in format "owner/repo"'
  );
});

Deno.test('createCodespace validation - invalid branch name', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.createCodespace('owner/repo', ''),
    GitHubCodespaceServiceError,
    'Branch name cannot be empty'
  );
});

Deno.test('deleteCodespace success', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespace = createMockCodespace({ name: 'test-codespace' });
  mockRepository.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  await service.deleteCodespace('test-codespace');

  assertEquals(mockRepository.findByNameCalls, ['test-codespace']);
  assertEquals(mockRepository.deleteCalls, ['test-codespace']);
});

Deno.test('deleteCodespace not found', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  mockRepository.setMockCodespaces([]);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.deleteCodespace('nonexistent'),
    GitHubCodespaceServiceError,
    'Codespace \'nonexistent\' not found'
  );
});

Deno.test('deleteCodespace validation - empty name', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.deleteCodespace(''),
    GitHubCodespaceServiceError,
    'Codespace name is required'
  );
});

Deno.test('getCodespaceStatus success', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespace = createMockCodespace({ name: 'target-codespace' });
  mockRepository.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  const result = await service.getCodespaceStatus('target-codespace');

  assertEquals(result.name, 'target-codespace');
  assertEquals(mockRepository.findByNameCalls, ['target-codespace']);
});

Deno.test('getCodespaceStatus not found', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  mockRepository.setMockCodespaces([]);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.getCodespaceStatus('nonexistent'),
    GitHubCodespaceServiceError,
    'Codespace \'nonexistent\' not found'
  );
});

Deno.test('startCodespace success', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespace = createMockCodespace({ name: 'test-codespace', state: 'Shutdown' });
  mockRepository.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  const result = await service.startCodespace('test-codespace');

  assertEquals(result.state, 'Available');
  assertEquals(mockRepository.startCalls, ['test-codespace']);
});

Deno.test('stopCodespace success', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespace = createMockCodespace({ name: 'test-codespace', state: 'Available' });
  mockRepository.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  const result = await service.stopCodespace('test-codespace');

  assertEquals(result.state, 'Shutdown');
  assertEquals(mockRepository.stopCalls, ['test-codespace']);
});

Deno.test('cleanupOldCodespaces success', async () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);
  
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1);

  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();
  const mockCodespaces = [
    createMockCodespace({ name: 'old-codespace', last_used_at: oldDate.toISOString() }),
    createMockCodespace({ name: 'recent-codespace', last_used_at: recentDate.toISOString() }),
  ];
  mockRepository.setMockCodespaces(mockCodespaces);

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);
  const deletedCount = await service.cleanupOldCodespaces(undefined, 5);

  assertEquals(deletedCount, 1);
  assertEquals(mockRepository.deleteCalls, ['old-codespace']);
});

Deno.test('cleanupOldCodespaces validation - invalid days', async () => {
  const mockRepository = new MockGitHubCodespaceRepository();
  const mockAuthService = new MockGitHubAuthService();

  const service = new GitHubCodespaceServiceImpl(mockRepository, mockAuthService);

  await assertRejects(
    () => service.cleanupOldCodespaces(undefined, 0),
    GitHubCodespaceServiceError,
    'olderThanDays must be at least 1'
  );
});

Deno.test('GitHubCodespaceServiceError constructor', () => {
  const cause = new Error('Underlying error');
  const error = new GitHubCodespaceServiceError('Test message', 'testOperation', cause);
  
  assertEquals(error.message, 'Test message');
  assertEquals(error.operation, 'testOperation');
  assertEquals(error.cause, cause);
  assertEquals(error.name, 'GitHubCodespaceServiceError');
});