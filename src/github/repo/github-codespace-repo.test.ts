import { assertEquals, assertRejects, assertInstanceOf } from '@std/assert';
import { GitHubCodespaceRepositoryImpl, createGitHubCodespaceRepository } from './github-codespace-repo.ts';
import type { IGhCliWrapper } from '../utils/gh-cli-wrapper.ts';
import type { Codespace, CreateCodespaceOptions } from '../models/codespace-model.ts';

// Mock implementation of GhCliWrapper
class MockGhCliWrapper implements IGhCliWrapper {
  public listCodespacesCalls: string[] = [];
  public createCodespaceCalls: CreateCodespaceOptions[] = [];
  public deleteCodespaceCalls: { name: string; force?: boolean }[] = [];
  public getCodespaceStatusCalls: string[] = [];

  private mockCodespaces: Codespace[] = [];
  private shouldThrowOnCreate = false;
  private shouldThrowOnDelete = false;
  private shouldThrowOnGet = false;

  setMockCodespaces(codespaces: Codespace[]) {
    this.mockCodespaces = codespaces;
  }

  setShouldThrowOnCreate(shouldThrow: boolean) {
    this.shouldThrowOnCreate = shouldThrow;
  }

  setShouldThrowOnDelete(shouldThrow: boolean) {
    this.shouldThrowOnDelete = shouldThrow;
  }

  setShouldThrowOnGet(shouldThrow: boolean) {
    this.shouldThrowOnGet = shouldThrow;
  }

  async listCodespaces(repository?: string): Promise<Codespace[]> {
    this.listCodespacesCalls.push(repository || 'all');
    if (repository) {
      return this.mockCodespaces.filter(cs => `${cs.owner}/${cs.repository}` === repository);
    }
    return [...this.mockCodespaces];
  }

  async createCodespace(options: CreateCodespaceOptions): Promise<Codespace> {
    this.createCodespaceCalls.push(options);
    if (this.shouldThrowOnCreate) {
      throw new Error('Mock create error');
    }

    const [owner, repo] = options.repository.split('/');
    return {
      name: 'mock-codespace-123',
      displayName: 'Mock Codespace',
      repository: repo,
      owner,
      branch: options.branch || 'main',
      state: 'Starting',
      machineType: options.machineType || '2core',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
  }

  async deleteCodespace(name: string, force?: boolean): Promise<void> {
    this.deleteCodespaceCalls.push({ name, force });
    if (this.shouldThrowOnDelete) {
      throw new Error('Mock delete error');
    }
  }

  async getCodespaceStatus(name: string): Promise<Codespace> {
    this.getCodespaceStatusCalls.push(name);
    if (this.shouldThrowOnGet) {
      throw new Error('Codespace not found');
    }

    const found = this.mockCodespaces.find(cs => cs.name === name);
    if (!found) {
      throw new Error('Codespace not found');
    }
    return found;
  }

  async checkAuthentication(): Promise<boolean> {
    return true;
  }
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

Deno.test('GitHubCodespaceRepository factory function', () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = createGitHubCodespaceRepository(mockWrapper);
  assertInstanceOf(repository, GitHubCodespaceRepositoryImpl);
});

Deno.test('findAll without repository filter', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [
    createMockCodespace({ name: 'codespace-1' }),
    createMockCodespace({ name: 'codespace-2' }),
  ];
  mockWrapper.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  const result = await repository.findAll();

  assertEquals(result.length, 2);
  assertEquals(result[0].name, 'codespace-1');
  assertEquals(result[1].name, 'codespace-2');
  assertEquals(mockWrapper.listCodespacesCalls, ['all']);
});

Deno.test('findAll with repository filter', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [
    createMockCodespace({ name: 'codespace-1', owner: 'owner1', repository: 'repo1' }),
    createMockCodespace({ name: 'codespace-2', owner: 'owner2', repository: 'repo2' }),
  ];
  mockWrapper.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  const result = await repository.findAll('owner1/repo1');

  assertEquals(result.length, 1);
  assertEquals(result[0].name, 'codespace-1');
  assertEquals(mockWrapper.listCodespacesCalls, ['owner1/repo1']);
});

Deno.test('findByName success', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespace = createMockCodespace({ name: 'target-codespace' });
  mockWrapper.setMockCodespaces([mockCodespace]);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  const result = await repository.findByName('target-codespace');

  assertEquals(result?.name, 'target-codespace');
  assertEquals(mockWrapper.getCodespaceStatusCalls, ['target-codespace']);
});

Deno.test('findByName not found', async () => {
  const mockWrapper = new MockGhCliWrapper();
  mockWrapper.setShouldThrowOnGet(true);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  const result = await repository.findByName('nonexistent');

  assertEquals(result, null);
});

Deno.test('create with valid options', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  const options: CreateCodespaceOptions = {
    repository: 'owner/repo',
    branch: 'feature-branch',
    machineType: '4core',
  };

  const result = await repository.create(options);

  assertEquals(result.name, 'mock-codespace-123');
  assertEquals(result.branch, 'feature-branch');
  assertEquals(mockWrapper.createCodespaceCalls.length, 1);
  assertEquals(mockWrapper.createCodespaceCalls[0], options);
});

Deno.test('create validation - empty repository', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  await assertRejects(
    () => repository.create({ repository: '' }),
    Error,
    'Repository is required for codespace creation'
  );
});

Deno.test('create validation - invalid repository format', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  await assertRejects(
    () => repository.create({ repository: 'invalid-format' }),
    Error,
    'Repository must be in format "owner/repo"'
  );
});

Deno.test('create validation - invalid retention period', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  await assertRejects(
    () => repository.create({ repository: 'owner/repo', retentionPeriod: 0 }),
    Error,
    'Retention period must be a positive integer'
  );

  await assertRejects(
    () => repository.create({ repository: 'owner/repo', retentionPeriod: 31 }),
    Error,
    'Retention period cannot exceed 30 days'
  );
});

Deno.test('delete success', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  await repository.delete('test-codespace');

  assertEquals(mockWrapper.deleteCodespaceCalls.length, 1);
  assertEquals(mockWrapper.deleteCodespaceCalls[0].name, 'test-codespace');
  assertEquals(mockWrapper.deleteCodespaceCalls[0].force, false);
});

Deno.test('delete with force', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  await repository.delete('test-codespace', true);

  assertEquals(mockWrapper.deleteCodespaceCalls.length, 1);
  assertEquals(mockWrapper.deleteCodespaceCalls[0].force, true);
});

Deno.test('delete validation - empty name', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);

  await assertRejects(
    () => repository.delete(''),
    Error,
    'Codespace name is required for deletion'
  );
});

Deno.test('deleteAll without filters', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [
    createMockCodespace({ name: 'codespace-1' }),
    createMockCodespace({ name: 'codespace-2' }),
  ];
  mockWrapper.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  await repository.deleteAll();

  assertEquals(mockWrapper.deleteCodespaceCalls.length, 2);
  assertEquals(mockWrapper.deleteCodespaceCalls[0].name, 'codespace-1');
  assertEquals(mockWrapper.deleteCodespaceCalls[1].name, 'codespace-2');
});

Deno.test('deleteAll with age filter', async () => {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 10);
  
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 1);

  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [
    createMockCodespace({ name: 'old-codespace', lastUsedAt: oldDate }),
    createMockCodespace({ name: 'recent-codespace', lastUsedAt: recentDate }),
  ];
  mockWrapper.setMockCodespaces(mockCodespaces);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  await repository.deleteAll(undefined, 5);

  assertEquals(mockWrapper.deleteCodespaceCalls.length, 1);
  assertEquals(mockWrapper.deleteCodespaceCalls[0].name, 'old-codespace');
});

Deno.test('deleteAll handles individual deletion failures gracefully', async () => {
  const mockWrapper = new MockGhCliWrapper();
  const mockCodespaces = [
    createMockCodespace({ name: 'codespace-1' }),
    createMockCodespace({ name: 'codespace-2' }),
  ];
  mockWrapper.setMockCodespaces(mockCodespaces);
  mockWrapper.setShouldThrowOnDelete(true);

  const repository = new GitHubCodespaceRepositoryImpl(mockWrapper);
  
  // Should not throw even though deletions fail
  await repository.deleteAll();

  assertEquals(mockWrapper.deleteCodespaceCalls.length, 2);
});