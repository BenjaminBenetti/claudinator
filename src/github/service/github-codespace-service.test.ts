import { assertEquals, assertRejects, assertInstanceOf } from '@std/assert';
import { 
  GitHubCodespaceServiceImpl, 
  GitHubCodespaceServiceError,
  createGitHubCodespaceService 
} from './github-codespace-service.ts';
import type { GitHubCodespaceRepository } from '../repo/github-codespace-repo.ts';
import type { IGhCliWrapper } from '../utils/gh-cli-wrapper.ts';
import type { Codespace, CreateCodespaceOptions } from '../models/codespace-model.ts';

// Mock implementations
class MockGitHubCodespaceRepository implements GitHubCodespaceRepository {
  public findAllCalls: string[] = [];
  public findByNameCalls: string[] = [];
  public createCalls: CreateCodespaceOptions[] = [];
  public deleteCalls: { name: string; force?: boolean }[] = [];
  public deleteAllCalls: { repository?: string; olderThanDays?: number }[] = [];

  private mockCodespaces: Codespace[] = [];
  private shouldThrowOnCreate = false;
  private shouldThrowOnDelete = false;
  private shouldThrowOnFind = false;

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
    return await Promise.resolve(this.mockCodespaces.find(cs => cs.name === name) || null);
  }

  async create(options: CreateCodespaceOptions): Promise<Codespace> {
    this.createCalls.push(options);
    if (this.shouldThrowOnCreate) {
      throw new Error('Mock create error');
    }

    const [owner, repo] = options.repository.split('/');
    return await Promise.resolve({
      name: 'mock-codespace-123',
      displayName: 'Mock Codespace',
      repository: repo,
      owner,
      branch: options.branch || 'main',
      state: 'Available',
      machineType: options.machineType || '2core',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });
  }

  async delete(name: string, force?: boolean): Promise<void> {
    this.deleteCalls.push({ name, force });
    if (this.shouldThrowOnDelete) {
      throw new Error('Mock delete error');
    }
    return await Promise.resolve();
  }

  async deleteAll(repository?: string, olderThanDays?: number): Promise<void> {
    this.deleteAllCalls.push({ repository, olderThanDays });
    return await Promise.resolve();
  }
}

class MockGhCliWrapper implements IGhCliWrapper {
  public checkAuthenticationCalls = 0;
  private shouldThrowOnAuth = false;
  private isAuthenticated = true;

  setShouldThrowOnAuth(shouldThrow: boolean) {
    this.shouldThrowOnAuth = shouldThrow;
  }

  setIsAuthenticated(authenticated: boolean) {
    this.isAuthenticated = authenticated;
  }

  async checkAuthentication(): Promise<boolean> {
    this.checkAuthenticationCalls++;
    if (this.shouldThrowOnAuth) {
      throw new Error('Mock auth error');
    }
    return await Promise.resolve(this.isAuthenticated);
  }

  // Required interface methods (not used in service tests)
  async listCodespaces(): Promise<Codespace[]> { return await Promise.resolve([]); }
  async createCodespace(): Promise<Codespace> { return await Promise.resolve({} as Codespace); }
  async deleteCodespace(): Promise<void> { return await Promise.resolve(); }
  async getCodespaceStatus(): Promise<Codespace> { return await Promise.resolve({} as Codespace); }
}

function createMockCodespace(overrides: Partial<Codespace> = {}): Codespace {
  return {
    name: 'test-codespace-123',
    displayName: 'Test Codespace',
    repository: 'test-repo',
    owner: 'test-owner',
    branch: 'main',
    state: 'Available',
    machineType: '2core',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastUsedAt: new Date('2024-01-02T00:00:00Z'),
    ...overrides,
  };
}

Deno.test('GitHubCodespaceService factory function', () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  const service = createGitHubCodespaceService(mockRepo, mockWrapper);
  assertInstanceOf(service, GitHubCodespaceServiceImpl);
});

Deno.test('listCodespaces success', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [createMockCodespace({ name: 'codespace-1' })];
  mockRepo.setMockCodespaces(mockCodespaces);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  const result = await service.listCodespaces();

  assertEquals(result.length, 1);
  assertEquals(result[0].name, 'codespace-1');
  assertEquals(mockWrapper.checkAuthenticationCalls, 1);
  assertEquals(mockRepo.findAllCalls, ['all']);
});

Deno.test('listCodespaces with repository filter', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockRepo.setMockCodespaces([]);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  await service.listCodespaces('owner/repo');

  assertEquals(mockRepo.findAllCalls, ['owner/repo']);
});

Deno.test('listCodespaces authentication failure', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockWrapper.setIsAuthenticated(false);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.listCodespaces(),
    GitHubCodespaceServiceError,
    'Authentication check failed'
  );
});

Deno.test('listCodespaces invalid repository format', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.listCodespaces('invalid-format'),
    GitHubCodespaceServiceError,
    'Repository must be in format "owner/repo"'
  );
});

Deno.test('createCodespace success', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespace = createMockCodespace({ name: 'mock-codespace-123' });
  mockRepo.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  const result = await service.createCodespace('owner/repo', 'feature-branch');

  assertEquals(result.name, 'mock-codespace-123');
  assertEquals(mockRepo.createCalls.length, 1);
  assertEquals(mockRepo.createCalls[0].repository, 'owner/repo');
  assertEquals(mockRepo.createCalls[0].branch, 'feature-branch');
  assertEquals(mockRepo.createCalls[0].machineType, '2core');
});

Deno.test('createCodespace validation - invalid repository', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.createCodespace('invalid'),
    GitHubCodespaceServiceError,
    'Repository must be in format "owner/repo"'
  );
});

Deno.test('createCodespace validation - invalid branch', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.createCodespace('owner/repo', ''),
    GitHubCodespaceServiceError,
    'Branch name cannot be empty'
  );

  await assertRejects(
    () => service.createCodespace('owner/repo', 'branch..with..dots'),
    GitHubCodespaceServiceError,
    'Invalid branch name format'
  );
});

Deno.test('deleteCodespace success', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespace = createMockCodespace({ name: 'target-codespace' });
  mockRepo.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  await service.deleteCodespace('target-codespace');

  assertEquals(mockRepo.findByNameCalls, ['target-codespace']);
  assertEquals(mockRepo.deleteCalls.length, 1);
  assertEquals(mockRepo.deleteCalls[0].name, 'target-codespace');
  assertEquals(mockRepo.deleteCalls[0].force, true);
});

Deno.test('deleteCodespace not found', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockRepo.setMockCodespaces([]); // No codespaces

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.deleteCodespace('nonexistent'),
    GitHubCodespaceServiceError,
    "Codespace 'nonexistent' not found"
  );
});

Deno.test('deleteCodespace validation - empty name', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.deleteCodespace(''),
    GitHubCodespaceServiceError,
    'Codespace name is required'
  );
});

Deno.test('getCodespaceStatus success', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespace = createMockCodespace({ name: 'target-codespace' });
  mockRepo.setMockCodespaces([mockCodespace]);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  const result = await service.getCodespaceStatus('target-codespace');

  assertEquals(result.name, 'target-codespace');
  assertEquals(mockRepo.findByNameCalls, ['target-codespace']);
});

Deno.test('getCodespaceStatus not found', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockRepo.setMockCodespaces([]);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.getCodespaceStatus('nonexistent'),
    GitHubCodespaceServiceError,
    "Codespace 'nonexistent' not found"
  );
});

Deno.test('cleanupOldCodespaces success', async () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);

  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [
    createMockCodespace({ name: 'old-codespace', lastUsedAt: oldDate }),
    createMockCodespace({ name: 'recent-codespace', lastUsedAt: new Date() }),
  ];
  mockRepo.setMockCodespaces(mockCodespaces);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  const deletedCount = await service.cleanupOldCodespaces(undefined, 5);

  assertEquals(deletedCount, 1);
  assertEquals(mockRepo.deleteCalls.length, 1);
  assertEquals(mockRepo.deleteCalls[0].name, 'old-codespace');
});

Deno.test('cleanupOldCodespaces validation - invalid days', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.cleanupOldCodespaces(undefined, 0),
    GitHubCodespaceServiceError,
    'olderThanDays must be at least 1'
  );
});

Deno.test('ensureAuthenticated success', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockWrapper.setIsAuthenticated(true);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  await service.ensureAuthenticated();

  assertEquals(mockWrapper.checkAuthenticationCalls, 1);
});

Deno.test('ensureAuthenticated failure', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockWrapper.setIsAuthenticated(false);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.ensureAuthenticated(),
    GitHubCodespaceServiceError,
    'Authentication check failed'
  );
});

Deno.test('ensureAuthenticated error handling', async () => {
  const mockRepo = new MockGitHubCodespaceRepository();
  const mockWrapper = new MockGhCliWrapper();
  mockWrapper.setShouldThrowOnAuth(true);

  const service = new GitHubCodespaceServiceImpl(mockRepo, mockWrapper);
  
  await assertRejects(
    () => service.ensureAuthenticated(),
    GitHubCodespaceServiceError,
    'Authentication check failed'
  );
});