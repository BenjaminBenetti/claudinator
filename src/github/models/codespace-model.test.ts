import { assertEquals } from '@std/assert';
import type { Codespace, CodespaceState, CreateCodespaceOptions } from './codespace-model.ts';

Deno.test('Codespace interface validation', () => {
  const mockCodespace: Codespace = {
    name: 'test-codespace-123',
    displayName: 'Test Codespace',
    repository: 'test-repo',
    owner: 'test-owner',
    branch: 'main',
    state: 'Available' as CodespaceState,
    machineType: '2core',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastUsedAt: new Date('2024-01-02T00:00:00Z'),
    url: 'https://github.dev/test-owner/test-repo',
    gitStatus: 'clean'
  };

  assertEquals(mockCodespace.name, 'test-codespace-123');
  assertEquals(mockCodespace.state, 'Available');
  assertEquals(mockCodespace.owner, 'test-owner');
  assertEquals(mockCodespace.repository, 'test-repo');
});

Deno.test('CodespaceState type validation', () => {
  const validStates: CodespaceState[] = ['Available', 'Shutdown', 'Starting', 'Rebuilding', 'Error'];
  
  validStates.forEach(state => {
    const codespace: Partial<Codespace> = { state };
    assertEquals(codespace.state, state);
  });
});

Deno.test('CreateCodespaceOptions interface validation', () => {
  const minimalOptions: CreateCodespaceOptions = {
    repository: 'owner/repo'
  };

  const fullOptions: CreateCodespaceOptions = {
    repository: 'owner/repo',
    branch: 'feature-branch',
    machineType: 'basicLinux32gb',
    retentionPeriod: 30
  };

  assertEquals(minimalOptions.repository, 'owner/repo');
  assertEquals(fullOptions.branch, 'feature-branch');
  assertEquals(fullOptions.machineType, 'basicLinux32gb');
  assertEquals(fullOptions.retentionPeriod, 30);
});